import { Transaction } from "sequelize";
import sequelize from "../config/database.js";
import { Seat, Reservation, ReservationSeat } from "../models/index.js";
import { calculatePrice } from "../utils/pricing.js";
import {
  emitSeatUpdate,
  emitReservationUpdate,
} from "./socket.service.js";

const HOLD_DURATION_SECONDS = 60;

interface HoldSeatsInput {
  seatIds: number[];
  clientId: string;
}

export const holdSeats = async ({
  seatIds,
  clientId,
}: HoldSeatsInput) => {
  if (!seatIds || seatIds.length === 0) {
    throw new Error("At least one seat must be selected");
  }

  const uniqueSeatIds = [...new Set(seatIds)];

 
  uniqueSeatIds.sort((a, b) => a - b);

  const transaction = await sequelize.transaction();

  try {
    
    const seats = await Seat.findAll({
      where: {
        id: uniqueSeatIds,
      },
      order: [["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (seats.length !== uniqueSeatIds.length) {
      throw new Error("One or more seats do not exist");
    }

    const now = new Date();

    for (const seat of seats) {
      if (
        seat.status === "HELD" &&
        seat.heldUntil &&
        seat.heldUntil.getTime() <= now.getTime()
      ) {
        await seat.update(
          {
            status: "AVAILABLE",
            heldUntil: null,
          },
          {
            transaction,
          }
        );
      }
    }


    const currentSeats = await Seat.findAll({
      where: {
        id: uniqueSeatIds,
      },
      order: [["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const unavailableSeats = currentSeats.filter(
      (seat) => seat.status !== "AVAILABLE"
    );

    if (unavailableSeats.length > 0) {
      const seatNumbers = unavailableSeats
        .map((seat) => seat.seatNumber)
        .join(", ");

      throw new Error(
        `These seats are no longer available: ${seatNumbers}`
      );
    }

    const prices = currentSeats.map((seat) => seat.price);

    const { subtotal, discount, total } =
      calculatePrice(prices);

    const expiresAt = new Date(
      now.getTime() + HOLD_DURATION_SECONDS * 1000
    );

    const reservation = await Reservation.create(
      {
        clientId,
        status: "HOLDING",
        subtotal,
        discount,
        total,
        expiresAt,
      },
      {
        transaction,
      }
    );

    await ReservationSeat.bulkCreate(
      currentSeats.map((seat) => ({
        reservationId: reservation.id,
        seatId: seat.id,
        price: seat.price,
      })),
      {
        transaction,
      }
    );

    
    await Seat.update(
      {
        status: "HELD",
        heldUntil: expiresAt,
      },
      {
        where: {
          id: uniqueSeatIds,
        },
        transaction,
      }
    );

    await transaction.commit();
    emitSeatUpdate(uniqueSeatIds);

emitReservationUpdate(reservation.id);

    return {
      reservationId: reservation.id,
      status: reservation.status,
      seatIds: uniqueSeatIds,
      subtotal,
      discount,
      total,
      expiresAt,
    };
  } catch (error) {
   
    await transaction.rollback();

    throw error;
  }
};