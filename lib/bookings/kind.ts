import type { Booking, BookingKind } from "@/lib/db/types";

export function bookingKind(booking: Pick<Booking, "kind" | "rateCardItemId">): BookingKind {
  if (booking.kind === "private") return "private";
  if (booking.kind === "public") return "public";
  return booking.rateCardItemId ? "public" : "private";
}
