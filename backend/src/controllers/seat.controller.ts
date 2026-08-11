import { Request, Response } from "express";
import { Seat } from "../models/index.js";

export const getSeats = async (
  _req: Request,
  res: Response
) => {
  try {
    const seats = await Seat.findAll({
      order: [["id", "ASC"]],
    });

    return res.json(seats);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch seats",
    });
  }
};