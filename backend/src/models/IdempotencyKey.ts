import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class IdempotencyKey extends Model {
  declare id: number;
  declare key: string;
  declare reservationId: number;
  declare response: string | null;
}

IdempotencyKey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "idempotency_keys",
    timestamps: true,
  }
);

export default IdempotencyKey;