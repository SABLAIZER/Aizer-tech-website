import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  X,
} from 'lucide-react';
import { CmsPortfolioProject, FoodDish, PortfolioProject, WebsiteCmsData } from '../types';
import { Reveal } from './Reveal';

interface FoodAppShowcaseProps {
  cms: WebsiteCmsData;
  loading?: boolean;
  onBuildSimilarFoodApp: () => void;
}

const FOOD_MENU: FoodDish[] = [
  {
    id: 'jollof-suya',
    name: 'Smoky Party Jollof & Beef Suya',
    category: 'Jollof & Grill',
    priceGhs: 95,
    prepTime: '18 mins',
    description: 'Firewood-style jollof rice, spiced suya skewers, kelewele & pepper sauce.',
    accentTone: 'from-[#3B2314] to-[#1A120E]',
  },
  {
    id: 'tilapia-banku',
    name: 'Chargrilled Tilapia & Banku',
    category: 'Local Bowls',
    priceGhs: 120,
    prepTime: '22 mins',
    description: 'Whole seasoned Volta tilapia, smooth banku, green chili & red shito.',
    accentTone: 'from-[#2A2416] to-[#141310]',
  },
  {
    id: 'waakye-box',
    name: 'Waakye Heritage Executive Box',
    category: 'Local Bowls',
    priceGhs: 75,
    prepTime: '14 mins',
    description: 'Leaf-infused waakye, gari, braised beef, egg, fried plantain & wele.',
    accentTone: 'from-[#2D1A1E] to-[#151113]',
  },
  {
    id: 'sobolo-reserve',
    name: 'Chilled Ginger Sobolo Reserve',
    category: 'Drinks',
    priceGhs: 25,
    prepTime: '5 mins',
    description: 'Cold-pressed hibiscus infusion with fresh pineapple, cloves & mint.',
    accentTone: 'from-[#36141C] to-[#170E11]',
  },
];

const FLAGSHIP_FOOD_PROJECT: PortfolioProject = {
  id: 'chopbox-accra',
  title: 'ChopBox Accra — Food Ordering & Delivery App',
  category: 'Mobile App & Kitchen Dispatch',
  tierLabel: 'Mobile App Tier · From GHS 1,500',
  location: 'Osu & East Legon, Accra',
  summary:
    'A full-stack food ordering and dispatch ecosystem built for multi-branch restaurants in Accra, replacing high marketplace commissions with direct Mobile Money checkout and live rider tracking.',
  architecture: [
    'Cross-platform iOS & Android customer app with offline-tolerant menu caching',
    'Instant MTN MoMo, Telecel Cash, and Visa/Mastercard checkout webhook flow',
    'Zone-based Accra delivery fee matrix (Osu, Cantonments, Airport, East Legon)',
    'Real-time kitchen prep queue and 3-stage rider dispatch notifications',
  ],
  outcomes: [
    { label: 'Menu Load Speed', value: '1.4s' },
    { label: 'MoMo Checkout Flow', value: '3 Taps' },
    { label: 'Commission Saved', value: '22%' },
  ],
  stack: ['React Native', 'TypeScript', 'Firestore Live Sync', 'Mobile Money API'],
};

type PhoneTab = 'menu' | 'bag' | 'track';
type DishFilter = 'All' | 'Jollof & Grill' | 'Local Bowls' | 'Drinks';

export const FoodAppShowcase: React.FC<FoodAppShowcaseProps> = ({
  cms,
  loading = false,
  onBuildSimilarFoodApp,
}) => {
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('menu');
  const [dishFilter, setDishFilter] = useState<DishFilter>('All');
  const [cart, setCart] = useState<Record<string, number>>({
    'jollof-suya': 1,
    'sobolo-reserve': 1,
  });
  const [paymentMethod, setPaymentMethod] = useState<'MTN MoMo' | 'Telecel Cash' | 'Card'>(
    'MTN MoMo'
  );
  const [deliveryZone, setDeliveryZone] = useState<'Osu' | 'East Legon' | 'Airport'>('Osu');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [activeCmsProject, setActiveCmsProject] = useState<CmsPortfolioProject | null>(null);

  const filteredDishes = useMemo(() => {
    if (dishFilter === 'All') return FOOD_MENU;
    return FOOD_MENU.filter((dish) => dish.category === dishFilter);
  }, [dishFilter]);

  const cartItems = useMemo(() => {
    return FOOD_MENU.filter((dish) => (cart[dish.id] || 0) > 0).map((dish) => ({
      ...dish,
      qty: cart[dish.id] || 0,
    }));
  }, [cart]);

  const totalItemsCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const subtotalGhs = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.priceGhs * item.qty, 0),
    [cartItems]
  );

  const deliveryFee = deliveryZone === 'Osu' ? 15 : deliveryZone === 'Airport' ? 20 : 25;
  const grandTotalGhs = subtotalGhs > 0 ? subtotalGhs + deliveryFee : 0;

  const updateQty = (dishId: string, delta: number) => {
    setOrderPlaced(false);
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[dishId] || 0) + delta);
      return { ...prev, [dishId]: nextQty };
    });
  };

  const handleConfirmDemoOrder = () => {
    if (subtotalGhs <= 0) return;
    setOrderPlaced(true);
    setPhoneTab('track');
  };

  return (
    <section
      id="portfolio"
      aria-labelledby="portfolio-heading"
      className="py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-8 mb-10 sm:mb-14">
            <div className="max-w-2xl">
              <p className="text-sm text-accent font-medium mb-3">
                Featured Portfolio · Food App Case Study
              </p>
              <h2
                id="portfolio-heading"
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-1"
              >
                ChopBox Accra: interactive mobile food ordering built for local speed.
              </h2>
            </div>
            <p className="text-sm lg:text-base text-ink-muted max-w-md leading-relaxed">
              Test the live food ordering prototype inside the device frame—browse dishes in GHS, adjust quantities, and run a Mobile Money checkout.
            </p>
          </div>
        </Reveal>

        {/* Flagship Food App Split Showcase */}
        <Reveal delay={0.05}>
        <div className="ios-glass grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center rounded-[28px] p-5 sm:p-8 lg:p-12">
          {/* Left: Narrative & Outcomes */}
          <div className="lg:col-span-6 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mb-4">
                <span>Food Delivery App</span>
                <span aria-hidden="true">·</span>
                <span>iOS &amp; Android</span>
                <span aria-hidden="true">·</span>
                <span>Accra, Ghana</span>
              </div>

              <h3 className="font-display text-2xl lg:text-3xl font-semibold text-ink leading-[1.2] mb-4">
                {FLAGSHIP_FOOD_PROJECT.title}
              </h3>

              <p className="text-sm lg:text-base text-ink-secondary leading-relaxed mb-8">
                {FLAGSHIP_FOOD_PROJECT.summary}
              </p>

              {/* Quantitative Proof Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-y border-hairline mb-8">
                {FLAGSHIP_FOOD_PROJECT.outcomes.map((outcome) => (
                  <div key={outcome.label} className="min-w-0">
                    <p className="font-mono-tabular text-xl lg:text-2xl font-semibold text-accent leading-[1.2]">
                      {outcome.value}
                    </p>
                    <p className="text-xs text-ink-muted mt-1.5">{outcome.label}</p>
                  </div>
                ))}
              </div>

              {/* Architecture Highlights */}
              <div className="space-y-3 mb-9">
                {FLAGSHIP_FOOD_PROJECT.architecture.map((point) => (
                  <div key={point} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
                    <span className="text-accent mt-0.5 select-none shrink-0" aria-hidden="true">
                      —
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3.5 sm:gap-4">
              <button
                type="button"
                onClick={onBuildSimilarFoodApp}
                className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover sm:whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Build a Food App Like This</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveProject(FLAGSHIP_FOOD_PROJECT)}
                className="haptic-tap ios-glass-subtle w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-ink hover:border-accent/60 sm:whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-accent shrink-0" />
                <span>View Technical Specs</span>
              </button>
            </div>
          </div>

          {/* Right: Interactive iOS-Glass Mobile Food App Prototype */}
          <div className="lg:col-span-6 flex justify-center relative">
            <div className="w-full max-w-[382px] rounded-[2.6rem] bg-gradient-to-b from-[#1C1C22] via-[#0B0B0E] to-[#070708] border border-white/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_32px_70px_-18px_rgba(0,0,0,0.85)]">
              {/* Phone Screen */}
              <div className="rounded-[2.05rem] bg-[#0B0B0E] border border-white/[0.08] overflow-hidden flex flex-col min-h-[580px] relative">
                {/* iOS Dynamic Island & Status Bar */}
                <div className="px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono-tabular text-[#D4D4D8]">
                  <span>9:41</span>
                  <div
                    aria-hidden="true"
                    className="w-24 h-6 rounded-full bg-black border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] flex items-center justify-end pr-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#1C1C24] border border-white/10" />
                  </div>
                  <span>5G</span>
                </div>

                {/* App Top Bar */}
                <div className="px-5 pt-3 pb-3 border-b border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#D4A853]" />
                      <span>Delivering to {deliveryZone}, Accra</span>
                    </p>
                    <p className="font-display text-base font-semibold text-[#F4F3EF] mt-0.5">
                      ChopBox Kitchen
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhoneTab('bag')}
                    aria-label="Open food bag"
                    className="haptic-tap-sm ios-glass-subtle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#F4F3EF] hover:border-[#D4A853]/60 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#D4A853]" />
                    <span className="font-mono-tabular">{totalItemsCount}</span>
                  </button>
                </div>

                {/* App Frosted Glass Segmented Control */}
                <div className="px-4 pt-3">
                  <div className="ios-glass-subtle grid grid-cols-3 gap-1 p-1 rounded-xl">
                    {(
                      [
                        { id: 'menu', label: 'Menu' },
                        { id: 'bag', label: `Bag (${totalItemsCount})` },
                        { id: 'track', label: 'Track' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPhoneTab(tab.id)}
                        className={`haptic-tap-sm py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                          phoneTab === tab.id
                            ? 'bg-[#D4A853] text-[#070708] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                            : 'text-[#A1A1AA] hover:text-[#F4F3EF]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab 1: Menu */}
                {phoneTab === 'menu' && (
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Category Filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2">
                      {(['All', 'Jollof & Grill', 'Local Bowls', 'Drinks'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setDishFilter(cat)}
                            className={`haptic-tap-sm px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                              dishFilter === cat
                                ? 'bg-white/12 text-[#F4F3EF]'
                                : 'text-[#8E8E98] hover:text-[#E4E4E7]'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      )}
                    </div>

                    {/* Dish List */}
                    <div className="space-y-3 flex-1">
                      {filteredDishes.map((dish) => {
                        const qty = cart[dish.id] || 0;
                        return (
                          <div
                            key={dish.id}
                            className="rounded-xl bg-[#141418] border border-white/[0.07] p-3 flex gap-3 items-center"
                          >
                            {/* Bespoke Culinary Graphic Thumbnail */}
                            <div
                              className={`w-14 h-14 rounded-lg bg-gradient-to-br ${dish.accentTone} border border-white/10 shrink-0 flex items-center justify-center`}
                              aria-hidden="true"
                            >
                              <svg
                                viewBox="0 0 36 36"
                                className="w-8 h-8"
                                fill="none"
                              >
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="12"
                                  stroke="#D4A853"
                                  strokeWidth="1.3"
                                  strokeOpacity="0.8"
                                />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="6.5"
                                  fill="#D4A853"
                                  fillOpacity="0.22"
                                />
                                <path
                                  d="M13 18h10M18 13v10"
                                  stroke="#F4F3EF"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeOpacity="0.7"
                                />
                              </svg>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-[#F4F3EF] truncate">
                                  {dish.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-[#8E8E98] line-clamp-1 mt-0.5">
                                {dish.description}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-mono-tabular text-xs font-semibold text-[#D4A853]">
                                  GHS {dish.priceGhs}
                                </span>

                                {qty === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => updateQty(dish.id, 1)}
                                    className="haptic-tap-sm px-2.5 py-1 rounded-md bg-[#1F1F26] hover:bg-[#D4A853] hover:text-[#070708] text-[11px] font-medium text-[#F4F3EF] cursor-pointer"
                                  >
                                    Add
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-2 bg-[#1F1F26] rounded-md px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      aria-label={`Remove one ${dish.name}`}
                                      onClick={() => updateQty(dish.id, -1)}
                                      className="haptic-tap-sm p-1 text-[#A1A1AA] hover:text-[#F4F3EF] cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono-tabular text-xs font-medium text-[#F4F3EF]">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Add one ${dish.name}`}
                                      onClick={() => updateQty(dish.id, 1)}
                                      className="haptic-tap-sm p-1 text-[#A1A1AA] hover:text-[#F4F3EF] cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sticky Checkout Bar inside phone */}
                    {totalItemsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPhoneTab('bag')}
                        className="haptic-tap mt-4 w-full py-3 px-4 rounded-xl bg-[#D4A853] text-[#070708] text-xs font-semibold flex items-center justify-between hover:bg-[#E8C678] cursor-pointer"
                      >
                        <span>
                          View Bag ({totalItemsCount}{' '}
                          {totalItemsCount === 1 ? 'item' : 'items'})
                        </span>
                        <span className="font-mono-tabular">GHS {subtotalGhs}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Tab 2: Bag & MoMo Checkout */}
                {phoneTab === 'bag' && (
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#A1A1AA] mb-3">
                        Order Summary
                      </p>

                      {cartItems.length === 0 ? (
                        <div className="rounded-xl bg-[#141418] border border-white/[0.07] p-6 text-center">
                          <p className="text-sm text-[#F4F3EF] font-medium mb-1">
                            Your bag is empty
                          </p>
                          <p className="text-xs text-[#8E8E98] mb-4">
                            Add dishes from the menu to test the GHS checkout flow.
                          </p>
                          <button
                            type="button"
                            onClick={() => setPhoneTab('menu')}
                            className="haptic-tap-sm px-4 py-2 rounded-lg bg-[#D4A853] text-[#070708] text-xs font-semibold cursor-pointer"
                          >
                            Browse Menu
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2.5 mb-4">
                            {cartItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs bg-[#141418] border border-white/[0.06] rounded-lg px-3 py-2.5"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-[#F4F3EF] font-medium truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[#8E8E98] font-mono-tabular">
                                    {item.qty} × GHS {item.priceGhs}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.id, -1)}
                                    className="haptic-tap-sm w-6 h-6 rounded bg-[#1F1F26] text-[#F4F3EF] flex items-center justify-center cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.id, 1)}
                                    className="haptic-tap-sm w-6 h-6 rounded bg-[#1F1F26] text-[#F4F3EF] flex items-center justify-center cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Accra Delivery Zone */}
                          <p className="text-[11px] text-[#A1A1AA] mb-1.5">
                            Accra Delivery Zone
                          </p>
                          <div className="grid grid-cols-3 gap-1.5 mb-4">
                            {(['Osu', 'Airport', 'East Legon'] as const).map((zone) => (
                              <button
                                key={zone}
                                type="button"
                                onClick={() => setDeliveryZone(zone)}
                                className={`haptic-tap-sm py-1.5 rounded-md text-[11px] font-medium border cursor-pointer ${
                                  deliveryZone === zone
                                    ? 'bg-[#D4A853]/15 border-[#D4A853] text-[#F4F3EF]'
                                    : 'bg-[#141418] border-white/[0.07] text-[#A1A1AA]'
                                }`}
                              >
                                {zone}
                              </button>
                            ))}
                          </div>

                          {/* Payment Method */}
                          <p className="text-[11px] text-[#A1A1AA] mb-1.5">
                            Payment Method
                          </p>
                          <div className="grid grid-cols-3 gap-1.5 mb-4">
                            {(['MTN MoMo', 'Telecel Cash', 'Card'] as const).map(
                              (method) => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setPaymentMethod(method)}
                                  className={`haptic-tap-sm py-1.5 rounded-md text-[11px] font-medium border cursor-pointer ${
                                    paymentMethod === method
                                      ? 'bg-[#D4A853]/15 border-[#D4A853] text-[#F4F3EF]'
                                      : 'bg-[#141418] border-white/[0.07] text-[#A1A1AA]'
                                  }`}
                                >
                                  {method}
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {cartItems.length > 0 && (
                      <div className="border-t border-white/[0.08] pt-3 space-y-2">
                        <div className="flex justify-between text-xs text-[#A1A1AA]">
                          <span>Subtotal</span>
                          <span className="font-mono-tabular">GHS {subtotalGhs}</span>
                        </div>
                        <div className="flex justify-between text-xs text-[#A1A1AA]">
                          <span>Rider ({deliveryZone})</span>
                          <span className="font-mono-tabular">GHS {deliveryFee}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-[#F4F3EF] pt-1">
                          <span>Total</span>
                          <span className="font-mono-tabular text-[#D4A853]">
                            GHS {grandTotalGhs}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleConfirmDemoOrder}
                          className="haptic-tap mt-2 w-full py-3 rounded-xl bg-[#D4A853] text-[#070708] text-xs font-semibold hover:bg-[#E8C678] cursor-pointer"
                        >
                          Pay GHS {grandTotalGhs} via {paymentMethod}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Live Tracking */}
                {phoneTab === 'track' && (
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="rounded-xl bg-[#141418] border border-white/[0.08] p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-[#D4A853] font-medium">
                            {orderPlaced ? 'Order Confirmed' : 'Sample Live Dispatch'}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[#A1A1AA]">
                            #CB-4082
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#F4F3EF]">
                          Arriving in {deliveryZone} · 18–24 mins
                        </p>
                        <p className="text-xs text-[#8E8E98] mt-1">
                          Paid via {paymentMethod} ·{' '}
                          <span className="font-mono-tabular">
                            GHS {grandTotalGhs || 135}
                          </span>
                        </p>
                      </div>

                      {/* 3-Step Delivery Timeline */}
                      <div className="space-y-4 px-1">
                        {[
                          {
                            title: 'Kitchen Accepted & Grilling',
                            detail: 'Osu Flagship Kitchen · Ticket #4082',
                            done: true,
                          },
                          {
                            title: 'Rider Dispatched',
                            detail: 'Kwame Mensah · Motorbike GH-4821',
                            done: orderPlaced,
                          },
                          {
                            title: `En Route to ${deliveryZone}`,
                            detail: 'Estimated arrival in 18 mins',
                            done: false,
                          },
                        ].map((step) => (
                          <div key={step.title} className="flex items-start gap-3">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                step.done
                                  ? 'bg-[#D4A853] border-[#D4A853] text-[#070708]'
                                  : 'bg-[#141418] border-white/15 text-[#8E8E98]'
                              }`}
                            >
                              {step.done ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#F4F3EF]">
                                {step.title}
                              </p>
                              <p className="text-[11px] text-[#8E8E98] mt-0.5">
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPhoneTab('menu')}
                      className="haptic-tap w-full py-2.5 rounded-xl bg-[#1A1A20] border border-white/10 text-xs font-medium text-[#F4F3EF] hover:border-[#D4A853]/50 cursor-pointer"
                    >
                      Back to Menu Preview
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </Reveal>

        {/* Live Client Portfolio Projects from Firestore */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-64 rounded-[22px] ios-glass p-6" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cms.projects.map((project, idx) => (
              <Reveal key={project.id} delay={Math.min(idx * 0.05, 0.2)} className="w-full">
                <div className="h-full w-full min-w-0 ios-glass rounded-[22px] overflow-hidden flex flex-col justify-between hover:border-accent/50 transition-colors">
                  {project.imageUrl && (
                    <div className="w-full aspect-[16/10] bg-surface overflow-hidden border-b border-hairline">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted mb-3">
                        <span>
                          {project.category} · {project.location || cms.hero.location}
                        </span>
                        <span className="font-mono-tabular text-accent font-semibold">
                          {project.price}
                        </span>
                      </div>
                      <h3 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-2">
                        {project.title}
                      </h3>
                      {project.clientName && (
                        <p className="text-xs text-ink-subtle mb-3">
                          Client: {project.clientName}
                        </p>
                      )}
                      <p className="text-sm text-ink-secondary leading-relaxed mb-5">
                        {project.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-hairline flex items-center justify-between gap-3">
                      <span className="text-xs text-ink-subtle">
                        {project.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveCmsProject(project)}
                        className="haptic-tap text-sm font-medium text-accent hover:opacity-80 cursor-pointer whitespace-nowrap"
                      >
                        View Project →
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* Live Portfolio Project Lightbox */}
      {activeCmsProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cms-project-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveCmsProject(null)}
        >
          <div
            className="ios-glass max-w-xl w-full rounded-[24px] overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {activeCmsProject.imageUrl && (
              <div className="w-full aspect-[16/9] bg-surface border-b border-hairline">
                <img
                  src={activeCmsProject.imageUrl}
                  alt={activeCmsProject.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-hairline">
                <div>
                  <p className="text-xs text-accent font-medium mb-1">
                    {activeCmsProject.category} · {activeCmsProject.location || cms.hero.location}
                  </p>
                  <h3
                    id="cms-project-title"
                    className="font-display text-2xl font-semibold text-ink leading-[1.2]"
                  >
                    {activeCmsProject.title}
                  </h3>
                  {activeCmsProject.clientName && (
                    <p className="text-xs text-ink-muted mt-1">
                      Client: {activeCmsProject.clientName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close project details"
                  onClick={() => setActiveCmsProject(null)}
                  className="haptic-tap-sm w-10 h-10 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm lg:text-base text-ink-secondary leading-relaxed">
                {activeCmsProject.description}
              </p>

              <div className="pt-4 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-ink-subtle">Build Value</p>
                  <p className="font-mono-tabular text-base font-semibold text-accent">
                    {activeCmsProject.price}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCmsProject(null);
                    onBuildSimilarFoodApp();
                  }}
                  className="haptic-tap px-5 py-2.5 rounded-lg bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
                >
                  Request Similar Build
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Study Lightbox Modal */}
      {activeProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-study-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveProject(null)}
        >
          <div
            className="ios-glass max-w-2xl w-full rounded-[24px] p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-5 mb-6 border-b border-hairline">
              <div>
                <p className="text-xs text-accent font-medium mb-1">
                  {activeProject.category} · {activeProject.location}
                </p>
                <h3
                  id="case-study-title"
                  className="font-display text-2xl font-semibold text-ink leading-[1.2]"
                >
                  {activeProject.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close case study"
                onClick={() => setActiveProject(null)}
                className="haptic-tap-sm w-10 h-10 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm lg:text-base text-ink-secondary leading-relaxed mb-6">
              {activeProject.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-field border border-hairline mb-6">
              {activeProject.outcomes.map((item) => (
                <div key={item.label}>
                  <p className="font-mono-tabular text-lg font-semibold text-accent">
                    {item.value}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-medium text-ink-muted mb-3">
                Engineering Architecture
              </h4>
              <ul className="space-y-2.5">
                {activeProject.architecture.map((line) => (
                  <li key={line} className="text-sm text-ink-secondary flex items-start gap-2.5">
                    <span className="text-accent">—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-ink-subtle">
                Stack: {activeProject.stack.join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveProject(null);
                  onBuildSimilarFoodApp();
                }}
                className="haptic-tap px-5 py-2.5 rounded-lg bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
              >
                Request Similar Build
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
