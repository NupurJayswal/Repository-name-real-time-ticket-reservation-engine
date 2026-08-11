import { Request, Response } from "express";
import { holdSeats } from "../services/reservation.service.js";
import {
  confirmReservation,
} from "../services/confirmation.service.js";
import {
  Reservation,
  ReservationSeat,
} from "../models/index.js";

export const holdSeatsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { seatIds, clientId } = req.body;

    if (!Array.isArray(seatIds)) {
      return res.status(400).json({
        message: "seatIds must be an array",
      });
    }

    if (!clientId) {
      return res.status(400).json({
        message: "clientId is required",
      });
    }

    const result = await holdSeats({
      seatIds,
      clientId,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error(error);

    return res.status(409).json({
      message: error.message || "Unable to hold seats",
    });
  }
};

export const confirmReservationController = async (
  req: Request,
  res: Response
) => {
  try {
    const reservationId = Number(
      req.params.id
    );

    const idempotencyKey =
      req.header("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({
        message:
          "Idempotency-Key header is required",
      });
    }

    if (!reservationId) {
      return res.status(400).json({
        message:
          "Invalid reservation ID",
      });
    }

    const result =
      await confirmReservation({
        reservationId,
        idempotencyKey,
      });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(error);

    return res.status(409).json({
      message:
        error.message ||
        "Unable to confirm reservation",
    });
  }
};

export const getReservation = async (
  req: Request,
  res: Response
) => {
  try {
    const reservationId = Number(
      req.params.id
    );

    const reservation =
      await Reservation.findByPk(
        reservationId,
        {
          include: [
            {
              model: ReservationSeat,
            },
          ],
        }
      );

    if (!reservation) {
      return res.status(404).json({
        message:
          "Reservation not found",
      });
    }

    return res.json(reservation);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message:
        "Failed to fetch reservation",
    });
  }
};