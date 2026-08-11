import { Router } from "express";
import { getSeats } from "../controllers/seat.controller.js";

const router = Router();

router.get("/", getSeats);

export default router;