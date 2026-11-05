import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  CircleAlert,
  LogOut,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import {
  clearShopCustomerToken,
  getShopCustomerToken,
  shopCustomerApi,
} from "../services/shopCustomerApi";

const emptyProfile = { name: "", phone: "", address: "" };

function ShopCustomerExperience() {
  const { slug = "", orderId } = useParams();
  return <ShopCustomerPage key={slug} slug={slug} orderId={orderId} />;
}

function ShopCustomerPage({ slug, orderId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/shop/${slug}/customer`;
  const currentPath = location.pathname.slice(base.length).replace(/^\/+|\/+$/g, "");
  const page = currentPath.split("/")[0] || "products";
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`ims-shop-cart-${slug}`) || "[]");
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", address: "", password: "" });
  const [profileDraft, setProfileDraft] = useState(emptyProfile);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(`ims-shop-cart-${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  useEffect(() => {
    let active = true;
    async function loadShop() {
      setIsLoading(true);
      setError("");
      try {
        const [shopDetails, catalog] = await Promise.all([
          shopCustomerApi.shop(slug),
          shopCustomerApi.products(slug),
        ]);
        if (!active) return;
        setShop(shopDetails);
        setProducts(catalog);
        if (getShopCustomerToken()) {
          try {
            const customerData = await shopCustomerApi.profile(slug);
            if (!active) return;
            setProfile(customerData);
            setProfileDraft(customerData.customer || emptyProfile);
          } catch (requestError) {
            if (!active) return;
            if ([401, 403].includes(requestError.response?.status)) {
              clearShopCustomerToken();
              setProfile(null);
            } else {
              throw requestError;
            }
          }
        } else {
          setProfile(null);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || "This shop is unavailable right now.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadShop();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (page !== "orders" || !getShopCustomerToken()) return undefined;
    shopCustomerApi.orders(slug)
      .then((result) => {
        if (active) {
          setOrders(result);
          setOrdersLoaded(true);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load your shop orders.");
      });
    return () => { active = false; };
  }, [page, slug, profile]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      !query
      || product.name.toLowerCase().includes(query)
      || product.category.toLowerCase().includes(query)
      || product.sku.toLowerCase().includes(query)
    );
  }, [products, search]);

  const cartTotal = useMemo(() => cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  ), [cart]);

  function addToCart(product) {
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      return existing
        ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function adjustCartItem(productId, delta) {
    setCart((items) => items
      .map((item) => item.id === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      if (authMode === "register") {
        await shopCustomerApi.register(slug, authForm);
      } else {
        await shopCustomerApi.login(slug, { email: authForm.email, password: authForm.password });
      }
      const customerData = await shopCustomerApi.profile(slug);
      setProfile(customerData);
      setProfileDraft(customerData.customer || {
        name: authForm.name,
        phone: authForm.phone,
        address: authForm.address,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to access this shop account.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const customer = await shopCustomerApi.updateProfile(slug, profileDraft);
      setProfile((current) => ({ ...current, customer }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save your shop profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (!profile?.customer) {
      setError("Save your shop profile before placing an order.");
      navigate(`${base}/profile`);
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await shopCustomerApi.placeOrder(slug, {
        fulfillmentType: fulfillment,
        deliveryAddress: fulfillment === "delivery" ? deliveryAddress : "",
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });
      setCart([]);
      setOrders(await shopCustomerApi.orders(slug));
      navigate(`${base}/orders`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to place your order.");
    } finally {
      setIsSaving(false);
    }
  }

  function signOut() {
    clearShopCustomerToken();
    setProfile(null);
    setOrders([]);
    navigate(`${base}/products`, { replace: true });
  }

  const brandColor = shop?.brandColor || "#047857";
  const signedIn = Boolean(getShopCustomerToken());
  const title = page === "cart" ? "Your cart"
    : page === "checkout" ? "Checkout"
      : page === "orders" ? "Your orders"
        : page === "profile" ? "Your profile"
          : page === "login" ? "Customer sign in"
            : "Shop our products";

  if (isLoading && !shop) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Opening this shop…</main>;
  }
  if (error && !shop) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><p className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">{error}</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to={`${base}/products`} className="flex items-center gap-3">
            {shop?.logoUrl
              ? <img src={shop.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
              : <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: brandColor }}><Boxes size={20} /></span>}
            <span>
              <strong className="block text-slate-900">{shop?.name || slug}</strong>
              <small className="text-xs text-slate-500">Shop storefront</small>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <StoreLink to={`${base}/products`} active={page === "products"}>Products</StoreLink>
            <StoreLink to={`${base}/cart`} active={page === "cart"}>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</StoreLink>
            {signedIn && <>
              <StoreLink to={`${base}/orders`} active={page === "orders"}>Orders</StoreLink>
              <StoreLink to={`${base}/profile`} active={page === "profile"}>Profile</StoreLink>
            </>}
            {signedIn
              ? <button type="button" className="ml-1 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" onClick={signOut}><LogOut size={15} /> Sign out</button>
              : <Link to={`${base}/login`} className="ml-1 inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"><UserRound size={15} /> Sign in</Link>}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: brandColor }}>{shop?.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {shop?.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{shop.description}</p>}
          </div>
          {page !== "products" && <Link to={`${base}/products`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Continue shopping</Link>}
        </div>

        {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert"><CircleAlert size={17} />{error}</div>}

        {page === "login" && (
          <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm}
            onSubmit={submitAuth} isSaving={isSaving} signedIn={signedIn} profile={profile} />
        )}
        {page === "products" && (
          <>
            <div className="mb-5 flex max-w-xl items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input className="w-full outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" />
            </div>
            {filteredProducts.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-slate-50" style={{ color: brandColor }}><ShoppingBag size={21} /></span>
                    <p className="text-xs text-slate-500">{product.category || "Product"} · {product.sku}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{product.name}</h2>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <strong className="text-lg text-slate-900">{formatMoney(product.price)}</strong>
                      <button type="button" onClick={() => addToCart(product)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No matching in-stock products are available." />}
          </>
        )}
        {page === "cart" && (
          <CartPanel cart={cart} total={cartTotal} onAdjust={adjustCartItem} onCheckout={() => navigate(`${base}/checkout`)} brandColor={brandColor} />
        )}
        {page === "checkout" && (
          signedIn
            ? <CheckoutPanel profile={profile} fulfillment={fulfillment} setFulfillment={setFulfillment}
              deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} total={cartTotal}
              onSubmit={submitCheckout} isSaving={isSaving} brandColor={brandColor} base={base} />
            : <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm}
              onSubmit={submitAuth} isSaving={isSaving} signedIn={signedIn} profile={profile} />
        )}
        {page === "orders" && (
          signedIn
            ? orderId
            ? <InvoicePanel order={orders.find((order) => String(order.id) === String(orderId))} isLoading={!ordersLoaded} />
            : <OrdersPanel orders={orders} base={base} isLoading={!ordersLoaded} />
            : <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm}
              onSubmit={submitAuth} isSaving={isSaving} signedIn={signedIn} profile={profile} />
        )}
        {page === "profile" && (
          signedIn
            ? <ProfilePanel profile={profile} draft={profileDraft} setDraft={setProfileDraft}
              onSubmit={saveProfile} isSaving={isSaving} brandColor={brandColor} />
            : <AuthPanel mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm}
              onSubmit={submitAuth} isSaving={isSaving} signedIn={signedIn} profile={profile} />
        )}
        {!["login", "products", "cart", "checkout", "orders", "profile"].includes(page) && (
          <EmptyState text="This storefront page could not be found." />
        )}
      </div>
    </main>
  );
}

function StoreLink({ to, active, children }) {
  return <Link to={to} className={`rounded-lg px-3 py-2 ${active ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>{children}</Link>;
}

function AuthPanel({ mode, setMode, form, setForm, onSubmit, isSaving, signedIn, profile }) {
  if (signedIn) {
    return (
      <section className="max-w-xl rounded-2xl border border-emerald-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">You’re signed in</h2>
        <p className="mt-2 text-sm text-slate-600">{profile?.account?.email || "Complete your shop profile to continue."}</p>
      </section>
    );
  }
  const registering = mode === "register";
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">{registering ? "Create your customer account" : "Sign in to this shop"}</h2>
      <p className="text-sm text-slate-600">Your customer account can be used across shops. Orders and profile details stay separate for each shop.</p>
      {registering && <>
        <TextField label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <TextField label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />
        <TextField label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} />
      </>}
      <TextField label="Email address" type="email" autoComplete="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
      <TextField label="Password" type="password" autoComplete={registering ? "new-password" : "current-password"}
        minLength={registering ? 8 : undefined} value={form.password} onChange={(password) => setForm({ ...form, password })} required />
      <button type="submit" disabled={isSaving} className="w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "#047857" }}>
        {isSaving ? "Please wait…" : registering ? "Create account" : "Sign in"}
      </button>
      <button type="button" onClick={() => setMode(registering ? "login" : "register")} className="w-full text-center text-sm font-medium text-emerald-800 hover:underline">
        {registering ? "Already have an account? Sign in" : "New customer? Create an account"}
      </button>
    </form>
  );
}

function CartPanel({ cart, total, onAdjust, onCheckout, brandColor }) {
  if (!cart.length) return <EmptyState text="Your cart is empty. Browse the catalogue to add products." />;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {cart.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div><h2 className="font-semibold text-slate-900">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{formatMoney(item.price)} each</p></div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onAdjust(item.id, -1)} className="rounded-lg border border-slate-200 p-2"><Minus size={15} /></button>
              <span className="min-w-5 text-center">{item.quantity}</span>
              <button type="button" aria-label={`Add one ${item.name}`} onClick={() => onAdjust(item.id, 1)} className="rounded-lg border border-slate-200 p-2"><Plus size={15} /></button>
              <strong className="w-24 text-right">{formatMoney(item.price * item.quantity)}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 p-5">
        <p className="text-lg font-semibold text-slate-900">Total: {formatMoney(total)}</p>
        <button type="button" onClick={onCheckout} className="rounded-xl px-5 py-3 font-semibold text-white" style={{ backgroundColor: brandColor }}>Continue to checkout</button>
      </div>
    </section>
  );
}

function CheckoutPanel({ profile, fulfillment, setFulfillment, deliveryAddress, setDeliveryAddress, total, onSubmit, isSaving, brandColor, base }) {
  if (!profile?.customer) {
    return (
      <section className="max-w-xl rounded-2xl border border-amber-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Complete your shop profile</h2>
        <p className="mt-2 text-sm text-slate-600">Add your contact details in your profile before placing an order.</p>
        <Link to={`${base}/profile`} className="mt-4 inline-flex text-sm font-medium text-emerald-800 hover:underline">Complete profile</Link>
      </section>
    );
  }
  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">Order for <strong>{profile.customer.name}</strong> · {profile.customer.email}</p>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Pickup or delivery</span>
        <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3">
          <option value="pickup">Pickup</option><option value="delivery">Delivery</option>
        </select>
      </label>
      {fulfillment === "delivery" && <TextField label="Delivery address" value={deliveryAddress || profile.customer.address}
        onChange={setDeliveryAddress} required />}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <strong className="text-lg text-slate-900">Order total: {formatMoney(total)}</strong>
        <button type="submit" disabled={isSaving || total <= 0} className="rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: brandColor }}>
          {isSaving ? "Placing order…" : "Place order"}
        </button>
      </div>
    </form>
  );
}

function OrdersPanel({ orders, base, isLoading }) {
  if (isLoading) return <EmptyState text="Loading your shop orders…" />;
  if (!orders.length) return <EmptyState text="You have no orders with this shop yet." />;
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold text-slate-900">{order.orderNumber}</h2><p className="mt-1 text-sm text-slate-500">{order.date} · {order.fulfillmentType}</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">{order.status}</span>
          </div>
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {order.items.map((item, index) => <li key={`${order.id}-${index}`} className="flex justify-between gap-3 text-slate-600"><span>{item.productName} × {item.quantity}</span><span>{formatMoney(item.totalPrice)}</span></li>)}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 font-semibold text-slate-900"><span>Total</span><span>{formatMoney(order.totalPrice)}</span></div>
          <Link to={`${base}/orders/${order.id}`} className="mt-4 inline-flex text-sm font-medium text-emerald-800 hover:underline">View invoice</Link>
        </article>
      ))}
    </div>
  );
}

function InvoicePanel({ order, isLoading }) {
  if (isLoading) return <EmptyState text="Loading invoice…" />;
  if (!order) return <EmptyState text="This invoice is unavailable for your account." />;
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Order receipt</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">{order.orderNumber}</h2></div>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden">Print invoice</button>
      </div>
      <dl className="grid gap-4 py-5 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Order date</dt><dd className="mt-1 font-medium text-slate-900">{order.date}</dd></div>
        <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium text-slate-900">{order.status}</dd></div>
        <div><dt className="text-slate-500">Fulfillment</dt><dd className="mt-1 font-medium capitalize text-slate-900">{order.fulfillmentType}</dd></div>
      </dl>
      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Item</th><th className="py-3 text-right">Qty</th><th className="py-3 text-right">Price</th><th className="py-3 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{order.items.map((item, index) => <tr key={`${order.id}-${index}`}><td className="py-3 text-slate-800">{item.productName}</td><td className="py-3 text-right text-slate-600">{item.quantity}</td><td className="py-3 text-right text-slate-600">{formatMoney(item.unitPrice)}</td><td className="py-3 text-right text-slate-800">{formatMoney(item.totalPrice)}</td></tr>)}</tbody>
        </table>
      </div>
      {order.fulfillmentType === "delivery" && <p className="py-4 text-sm text-slate-600">Delivery address: {order.deliveryAddress}</p>}
      <p className="mt-5 flex justify-between text-lg font-semibold text-slate-900"><span>Total</span><span>{formatMoney(order.totalPrice)}</span></p>
    </article>
  );
}

function ProfilePanel({ profile, draft, setDraft, onSubmit, isSaving, brandColor }) {
  const customer = profile?.customer;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Shop-specific contact details</h2>
        <p className="text-sm text-slate-600">These details are kept separate for {profile?.shop?.name || "this shop"}.</p>
        <TextField label="Full name" value={draft.name || ""} onChange={(name) => setDraft({ ...draft, name })} required />
        <TextField label="Email address" type="email" value={profile?.account?.email || ""} disabled />
        <TextField label="Phone" value={draft.phone || ""} onChange={(phone) => setDraft({ ...draft, phone })} required />
        <TextField label="Delivery address" value={draft.address || ""} onChange={(address) => setDraft({ ...draft, address })} />
        <button type="submit" disabled={isSaving} className="rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: brandColor }}>
          {isSaving ? "Saving…" : "Save shop profile"}
        </button>
      </form>
      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3"><ShoppingCart size={19} className="text-slate-500" /><div><h2 className="font-semibold text-slate-900">Account details</h2><p className="text-sm text-slate-500">{profile?.account?.email}</p></div></div>
        <p className="mt-4 text-sm text-slate-600">{customer ? "Your order history for this shop is associated with this profile." : "Save your shop profile to start checkout."}</p>
      </section>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", required = false, autoComplete, minLength, disabled = false }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input type={type} required={required} minLength={minLength} autoComplete={autoComplete} disabled={disabled}
        value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-emerald-700 disabled:bg-slate-50" />
    </label>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500"><PackageCheck size={24} className="mx-auto mb-3 text-slate-400" />{text}</div>;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(value || 0);
}

export default ShopCustomerExperience;
