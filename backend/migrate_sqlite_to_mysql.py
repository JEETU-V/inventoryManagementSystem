import argparse
from pathlib import Path

from flask_migrate import stamp
from sqlalchemy import MetaData, Table, create_engine, func, inspect, select

from app import app
from models import db


SOURCE_REVISION = "cc8e1042f691"
NEW_TABLES_WITHOUT_SOURCE_DATA = {"rate_limit_buckets", "revoked_tokens"}


def inspect_source(source_path):
    if not source_path.is_file():
        raise RuntimeError(f"SQLite source database does not exist: {source_path}")

    source_engine = create_engine(f"sqlite:///{source_path}")
    with source_engine.connect() as connection:
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if "alembic_version" not in tables:
            raise RuntimeError("SQLite source has no Alembic revision; refusing transfer.")

        revisions = connection.execute(
            select(Table("alembic_version", MetaData(), autoload_with=connection).c.version_num)
        ).scalars().all()
        if revisions != [SOURCE_REVISION]:
            raise RuntimeError(
                f"Expected SQLite revision {SOURCE_REVISION}, found {revisions!r}. "
                "Review the source schema before transferring."
            )

        model_tables = set(db.metadata.tables)
        missing_tables = model_tables - NEW_TABLES_WITHOUT_SOURCE_DATA - tables
        unexpected_tables = tables - model_tables - {"alembic_version"}
        if missing_tables or unexpected_tables:
            raise RuntimeError(
                "SQLite source tables do not match the supported schema. "
                f"Missing: {sorted(missing_tables)}; "
                f"unexpected: {sorted(unexpected_tables)}."
            )

        counts = {
            table.name: connection.execute(
                select(func.count()).select_from(table)
            ).scalar_one()
            for table in (
                Table(name, MetaData(), autoload_with=connection)
                for name in sorted(tables - {"alembic_version"})
            )
        }

    return source_engine, tables, counts


def copy_source_data(source_engine, source_tables, target_engine):
    db.metadata.create_all(bind=target_engine)
    with source_engine.connect() as source_connection:
        reflected = MetaData()
        source_metadata = {
            name: Table(name, reflected, autoload_with=source_connection)
            for name in source_tables - {"alembic_version"}
        }

        with target_engine.begin() as target_connection:
            for target_table in db.metadata.sorted_tables:
                source_table = source_metadata.get(target_table.name)
                if source_table is None:
                    continue

                source_columns = set(source_table.c.keys())
                target_columns = set(target_table.c.keys())
                unknown_columns = source_columns - target_columns
                if unknown_columns:
                    raise RuntimeError(
                        f"{target_table.name} has source-only columns: "
                        f"{sorted(unknown_columns)}."
                    )

                for column in target_table.columns:
                    if (
                        column.name not in source_columns
                        and not column.nullable
                        and column.server_default is None
                        and column.default is None
                        and not (column.primary_key and column.autoincrement)
                    ):
                        raise RuntimeError(
                            f"{target_table.name}.{column.name} has no source "
                            "value or database default."
                        )

                result = source_connection.execute(select(source_table))
                while rows := result.mappings().fetchmany(500):
                    target_connection.execute(
                        target_table.insert(),
                        [
                            {
                                name: value
                                for name, value in row.items()
                                if name in target_columns
                            }
                            for row in rows
                        ],
                    )


def transfer(source_path, dry_run=False):
    source_path = source_path.expanduser().resolve()
    source_engine, source_tables, counts = inspect_source(source_path)

    with app.app_context():
        target_engine = db.engine
        if target_engine.dialect.name != "mysql":
            source_engine.dispose()
            raise RuntimeError("DATABASE_URL must point to the hosted MySQL database.")

        existing_target_tables = set(inspect(target_engine).get_table_names())
        if existing_target_tables:
            source_engine.dispose()
            raise RuntimeError(
                "The target MySQL database is not empty. No data was changed. "
                "Use a new empty database or inspect the existing schema manually."
            )

        total_rows = sum(counts.values())
        print(f"Source: {source_path}")
        print(f"Source Alembic revision: {SOURCE_REVISION}")
        print(f"Target dialect: {target_engine.dialect.name}")
        print(f"Tables to transfer: {len(counts)}; rows to transfer: {total_rows}")
        for table_name, row_count in counts.items():
            print(f"  {table_name}: {row_count}")

        if dry_run:
            print("Dry run complete. The target database was not changed.")
            source_engine.dispose()
            return

        try:
            copy_source_data(source_engine, source_tables, target_engine)

            stamp(revision="head")

            with target_engine.connect() as target_connection:
                target_revision = target_connection.execute(
                    select(Table(
                        "alembic_version",
                        MetaData(),
                        autoload_with=target_connection,
                    ).c.version_num)
                ).scalar_one()
                if target_revision != "f5180f4a91d2":
                    raise RuntimeError(
                        f"Unexpected target Alembic revision: {target_revision}."
                    )

                for table_name, expected_count in counts.items():
                    target_table = db.metadata.tables[table_name]
                    actual_count = target_connection.execute(
                        select(func.count()).select_from(target_table)
                    ).scalar_one()
                    if actual_count != expected_count:
                        raise RuntimeError(
                            f"Row-count mismatch for {table_name}: expected "
                            f"{expected_count}, got {actual_count}."
                        )

            print("Transfer completed and verified. SQLite source remains unchanged.")
        except Exception:
            app.logger.exception(
                "SQLite-to-MySQL transfer failed. The SQLite source was not modified; "
                "the MySQL target may contain a partially created schema and must be "
                "inspected before retrying."
            )
            raise
        finally:
            source_engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Copy the supported local SQLite database into an empty MySQL database."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(__file__).parent / "instance" / "inventory_dev.db",
        help="Path to the SQLite source database.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate the source and MySQL connection without modifying MySQL.",
    )
    arguments = parser.parse_args()
    transfer(arguments.source, dry_run=arguments.dry_run)


if __name__ == "__main__":
    main()
