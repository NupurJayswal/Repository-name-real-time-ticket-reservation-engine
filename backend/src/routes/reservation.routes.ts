import { Router } from "express";

import {
  holdSeatsController,
  confirmReservationController,
  getReservation,
} from "../controllers/reservation.controller.js";

const router = Router();

router.post(
  "/hold",
  holdSeatsController
);

router.post(
  "/:id/confirm",
  confirmReservationController
);

router.get(
  "/:id",
  getReservation
);

export default router;