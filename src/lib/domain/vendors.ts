// Vendor labels and the coverage view: which categories have someone booked.

export type VendorCategory =
  | "VENUE" | "CATERING" | "PHOTOGRAPHY" | "VIDEOGRAPHY" | "FLORAL" | "MUSIC_DJ" | "MUSIC_CEREMONY"
  | "CAKE" | "ATTIRE" | "BEAUTY" | "STATIONERY" | "RENTALS" | "TRANSPORT" | "OFFICIANT" | "LODGING" | "OTHER";

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  FLORAL: "Florist",
  MUSIC_DJ: "DJ",
  MUSIC_CEREMONY: "Ceremony music",
  CAKE: "Cake & dessert",
  ATTIRE: "Attire",
  BEAUTY: "Hair & makeup",
  STATIONERY: "Stationery",
  RENTALS: "Rentals",
  TRANSPORT: "Transportation",
  OFFICIANT: "Officiant",
  LODGING: "Hotel block",
  OTHER: "Other",
};

export const VENDOR_STATUS_LABEL = {
  RESEARCHING: "Researching",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  BOOKED: "Booked",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
} as const;

export function coverage(
  vendors: Array<{ name: string; category: VendorCategory; alsoCovers: VendorCategory[]; status: keyof typeof VENDOR_STATUS_LABEL }>,
) {
  return (Object.keys(VENDOR_CATEGORY_LABEL) as VendorCategory[])
    .filter((c) => c !== "OTHER")
    .map((category) => {
      const covering = vendors.filter((v) => v.category === category || v.alsoCovers.includes(category));
      const booked = covering.filter((v) => v.status === "BOOKED");
      const inProgress = covering.filter((v) => ["CONTACTED", "QUOTED", "RESEARCHING"].includes(v.status));
      return {
        category,
        label: VENDOR_CATEGORY_LABEL[category],
        booked: booked.map((v) => v.name),
        inProgress: inProgress.length,
      };
    });
}
