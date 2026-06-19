function EmptyState({ title, description }) {
  return (
    <tr>
      <td colSpan={100} className="p-8 text-center">
        <p className="font-medium text-gray-700">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </td>
    </tr>
  );
}

export default EmptyState;
