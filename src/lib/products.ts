import headphones from "@/assets/p-headphones.jpg";
import watch from "@/assets/p-watch.jpg";
import sneaker from "@/assets/p-sneaker.jpg";
import perfume from "@/assets/p-perfume.jpg";
import laptop from "@/assets/p-laptop.jpg";
import backpack from "@/assets/p-backpack.jpg";
import sunglasses from "@/assets/p-sunglasses.jpg";
import mug from "@/assets/p-mug.jpg";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: "Audio" | "Wearables" | "Footwear" | "Beauty" | "Tech" | "Bags" | "Accessories" | "Home";
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  badge?: string;
  stock: number;
};

export const PRODUCTS: Product[] = [
  {
    id: "aurora-headphones",
    name: "Aurora Wireless Headphones",
    brand: "Lumen Audio",
    category: "Audio",
    price: 249,
    compareAt: 329,
    rating: 4.8,
    reviews: 1284,
    image: headphones,
    badge: "Best Seller",
    stock: 32,
    description:
      "Studio-grade 40mm drivers, hybrid active noise cancellation, and 40 hours of playback. Engineered for travelers who refuse to compromise.",
  },
  {
    id: "nova-smartwatch",
    name: "Nova Smartwatch Series 4",
    brand: "Pulse",
    category: "Wearables",
    price: 319,
    compareAt: 379,
    rating: 4.7,
    reviews: 942,
    image: watch,
    badge: "New",
    stock: 18,
    description:
      "A retina-grade AMOLED display, ECG and SpO2 sensors, and a 7-day battery that keeps up with you.",
  },
  {
    id: "stellar-runner",
    name: "Stellar Runner Knit",
    brand: "Velocity",
    category: "Footwear",
    price: 159,
    rating: 4.6,
    reviews: 562,
    image: sneaker,
    badge: "Trending",
    stock: 47,
    description:
      "Featherweight knit upper, responsive PEBA foam, and a violet-tinted outsole that absorbs every step.",
  },
  {
    id: "midnight-bloom",
    name: "Midnight Bloom Eau de Parfum",
    brand: "Maison Halo",
    category: "Beauty",
    price: 129,
    compareAt: 159,
    rating: 4.9,
    reviews: 318,
    image: perfume,
    stock: 24,
    description:
      "Top notes of pink pepper and bergamot fold into rose absolute and a base of warm amber. 50ml.",
  },
  {
    id: "halo-pro-laptop",
    name: "Halo Pro 14",
    brand: "Halo",
    category: "Tech",
    price: 1499,
    compareAt: 1699,
    rating: 4.8,
    reviews: 412,
    image: laptop,
    badge: "Editor's Pick",
    stock: 9,
    description:
      "M-class silicon, 14-inch HDR display, and an aluminum chassis machined to 8mm. For the work that matters.",
  },
  {
    id: "orbit-backpack",
    name: "Orbit Everyday Backpack",
    brand: "Voyage",
    category: "Bags",
    price: 119,
    rating: 4.5,
    reviews: 277,
    image: backpack,
    stock: 53,
    description:
      "Water-resistant nylon, a padded 16-inch laptop sleeve, and a magnetic top — built for daily commutes.",
  },
  {
    id: "eclipse-sunglasses",
    name: "Eclipse Polarized Sunglasses",
    brand: "Halcyon",
    category: "Accessories",
    price: 89,
    compareAt: 119,
    rating: 4.6,
    reviews: 188,
    image: sunglasses,
    stock: 65,
    description:
      "Italian acetate frames with iridescent polarized lenses. 100% UV protection — and a permanent mood.",
  },
  {
    id: "atlas-mug",
    name: "Atlas Ceramic Mug",
    brand: "Hearth",
    category: "Home",
    price: 24,
    rating: 4.7,
    reviews: 96,
    image: mug,
    stock: 120,
    description:
      "Hand-thrown stoneware with a satin glaze. Holds 12oz of your most ambitious mornings.",
  },
];

export const CATEGORIES = Array.from(new Set(PRODUCTS.map((p) => p.category)));

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents);