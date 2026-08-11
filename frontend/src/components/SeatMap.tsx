import { useEffect, useState } from "react";

import type { Seat } from "../types/seat";
import {
  fetchSeats,
  holdSeats,
  confirmReservation,
} from "../services/api";

import SeatCard from "./SeatCard";
import HoldCountdown from "./HoldCountdown";
import { socket } from "../services/socket";

const SeatMap = () => {
  const [seats, setSeats] = useState<Seat[]>([]);

  const [selectedSeats, setSelectedSeats] =
    useState<number[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [holding, setHolding] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [paymentStatus, setPaymentStatus] =
    useState<string | null>(null);

  const [reservation, setReservation] =
    useState<{
      reservationId: number;
      seatIds: number[];
      subtotal: number;
      discount: number;
      total: number;
      expiresAt: string;
    } | null>(null);

  /*
   * Load the latest seat state
   * from the backend.
   */
  const loadSeats = async () => {
    try {
      setLoading(true);

      const data = await fetchSeats();

      setSeats(data);

      setError(null);
    } catch (error) {
      console.error(
        "Failed to load seats:",
        error
      );

      setError(
        "Unable to load seats"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial seat loading.
   */
 useEffect(() => {
  /*
   * Initial authoritative state.
   */
  loadSeats();

  /*
   * Another browser changed
   * one or more seats.
   */
  const handleSeatUpdate = () => {
    console.log(
      "Seat update received from server"
    );

    loadSeats();
  };

  /*
   * Socket successfully connected.
   *
   * This is also important for
   * reconnection recovery.
   */
  const handleConnect = () => {
    console.log(
      "Socket connected:",
      socket.id
    );

    /*
     * Never assume our local state
     * is still correct after reconnect.
     *
     * Ask the server again.
     */
    loadSeats();
  };

  socket.on(
    "seats:updated",
    handleSeatUpdate
  );

  socket.on(
    "connect",
    handleConnect
  );

  /*
   * Cleanup listeners when component
   * unmounts.
   */
  return () => {
    socket.off(
      "seats:updated",
      handleSeatUpdate
    );

    socket.off(
      "connect",
      handleConnect
    );
  };
}, []);

  /*
   * Select / deselect a seat.
   */
  const handleSelectSeat = (
    seat: Seat
  ) => {
    /*
     * Only AVAILABLE seats can be selected.
     */
    if (seat.status !== "AVAILABLE") {
      return;
    }

    setSelectedSeats((current) => {
      /*
       * If already selected,
       * remove it.
       */
      if (current.includes(seat.id)) {
        return current.filter(
          (id) => id !== seat.id
        );
      }

      /*
       * Otherwise add it.
       */
      return [
        ...current,
        seat.id,
      ];
    });
  };

  /*
   * Hold selected seats.
   */
  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) {
      return;
    }

    try {
      setHolding(true);
      setError(null);
      setPaymentStatus(null);

      const data =
        await holdSeats(selectedSeats);

      /*
       * Store reservation returned
       * by the server.
       */
      setReservation(data);

      /*
       * Clear current selection.
       */
      setSelectedSeats([]);

      /*
       * Fetch latest authoritative
       * seat state from server.
       */
      await loadSeats();
    } catch (error) {
      console.error(
        "Failed to hold seats:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to hold seats"
      );

      /*
       * Another user may have
       * taken one of the seats.
       *
       * Refresh from server.
       */
      await loadSeats();
    } finally {
      setHolding(false);
    }
  };

  /*
   * Confirm reservation.
   */
  const handleConfirmReservation =
    async () => {
      /*
       * There must be an active
       * reservation.
       */
      if (!reservation) {
        return;
      }

      /*
       * Don't allow another confirmation
       * while one is already processing.
       */
      if (confirming) {
        return;
      }

      try {
        setConfirming(true);
        setError(null);

        /*
         * Idempotency key.
         *
         * This identifies this confirmation
         * request so duplicate requests can
         * safely be handled by the backend.
         */
        const idempotencyKey =
          crypto.randomUUID();

        const data =
          await confirmReservation(
            reservation.reservationId,
            idempotencyKey
          );

        /*
         * Backend initially returns:
         *
         * PAYMENT_PROCESSING
         */
        setPaymentStatus(
          data.status
        );
      } catch (error) {
        console.error(
          "Failed to confirm reservation:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to confirm reservation"
        );

        /*
         * Refresh authoritative
         * seat state.
         */
        await loadSeats();
      } finally {
        setConfirming(false);
      }
    };

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <p className="text-slate-500">
          Loading seats...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Seat map */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {seats.map((seat) => (
          <SeatCard
            key={seat.id}
            seat={seat}
            selected={selectedSeats.includes(
              seat.id
            )}
            onSelect={handleSelectSeat}
          />
        ))}
      </div>

      {/* Selection summary */}
      <div className="mt-8 flex flex-col gap-4 rounded-xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Selected seats
          </p>

          <p className="text-2xl font-bold text-slate-800">
            {selectedSeats.length}
          </p>
        </div>

        <button
          type="button"
          disabled={
            selectedSeats.length === 0 ||
            holding
          }
          onClick={handleHoldSeats}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {holding
            ? "Holding..."
            : "Hold Seats"}
        </button>
      </div>

      {/* Active reservation */}
      {reservation && (
        <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-800">
              Reservation
            </h2>

            <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-800">
              {paymentStatus ||
                "HOLDING"}
            </span>
          </div>

          {/* Reservation details */}
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>
                Reservation ID
              </span>

              <strong>
                #{reservation.reservationId}
              </strong>
            </div>

            <div className="flex justify-between">
              <span>
                Seats
              </span>

              <strong>
                {reservation.seatIds.join(
                  ", "
                )}
              </strong>
            </div>

            <div className="flex justify-between">
              <span>
                Subtotal
              </span>

              <strong>
                ₹{reservation.subtotal}
              </strong>
            </div>

            <div className="flex justify-between text-green-600">
              <span>
                Discount
              </span>

              <strong>
                -₹{reservation.discount}
              </strong>
            </div>

            <div className="border-t border-yellow-200 pt-3">
              <div className="flex justify-between text-lg font-bold text-slate-900">
                <span>
                  Total
                </span>

                <span>
                  ₹{reservation.total}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown */}
          {paymentStatus !==
            "PAYMENT_PROCESSING" && (
            <HoldCountdown
              expiresAt={
                reservation.expiresAt
              }
            />
          )}

          {/* Confirm button */}
          <button
            type="button"
            onClick={
              handleConfirmReservation
            }
            disabled={
              confirming ||
              paymentStatus ===
                "PAYMENT_PROCESSING"
            }
            className="mt-5 w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {confirming
              ? "Starting Payment..."
              : paymentStatus ===
                "PAYMENT_PROCESSING"
              ? "Payment Processing..."
              : "Confirm Reservation"}
          </button>

          {/* Payment processing */}
          {paymentStatus ===
            "PAYMENT_PROCESSING" && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

              <p className="font-semibold text-blue-700">
                Payment is processing...
              </p>

              <p className="mt-1 text-sm text-blue-600">
                Please wait. This may take
                2–5 seconds.
              </p>
            </div>
          )}

          {/* Reservation expires */}
          {paymentStatus ===
            "EXPIRED" && (
            <div className="mt-4 rounded-lg bg-red-100 p-4 text-center text-red-700">
              This reservation has expired.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeatMap;
