import type { Seat } from "../types/seat";

interface SeatCardProps {
  seat: Seat;
  selected: boolean;
  onSelect: (seat: Seat) => void;
}

const SeatCard = ({
  seat,
  selected,
  onSelect,
}: SeatCardProps) => {
  const isAvailable =
    seat.status === "AVAILABLE";

  const getSeatStyle = () => {
    if (seat.status === "BOOKED") {
      return "bg-red-100 border-red-400 text-red-700";
    }

    if (seat.status === "HELD") {
      return "bg-yellow-100 border-yellow-400 text-yellow-700";
    }

    if (selected) {
      return "bg-blue-600 border-blue-700 text-white";
    }

    return "bg-green-100 border-green-400 text-green-700";
  };

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => onSelect(seat)}
      className={`
        h-24
        rounded-xl
        border-2
        p-3
        transition
        ${getSeatStyle()}
        ${
          isAvailable
            ? "cursor-pointer hover:scale-105"
            : "cursor-not-allowed opacity-70"
        }
      `}
    >
      <div className="text-lg font-bold">
        {seat.seatNumber}
      </div>

      <div className="mt-1 text-sm">
        ₹{seat.price}
      </div>

      <div className="mt-1 text-xs font-semibold">
        {selected
          ? "SELECTED"
          : seat.status}
      </div>
    </button>
  );
};

export default SeatCard;