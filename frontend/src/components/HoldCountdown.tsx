import { useEffect, useState } from "react";

interface HoldCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

const HoldCountdown = ({
  expiresAt,
  onExpired,
}: HoldCountdownProps) => {
  const calculateRemaining = () => {
    const difference =
      new Date(expiresAt).getTime() -
      Date.now();

    return Math.max(
      0,
      Math.ceil(difference / 1000)
    );
  };

  const [remaining, setRemaining] =
    useState(calculateRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds =
        calculateRemaining();

      setRemaining(seconds);

      if (seconds === 0) {
        clearInterval(interval);

        onExpired?.();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(
    remaining / 60
  );

  const seconds = remaining % 60;

  return (
    <div className="mt-4 rounded-lg bg-white p-4 text-center">
      <p className="text-sm text-slate-500">
        Your seats are held for
      </p>

      <p
        className={`mt-1 text-3xl font-bold ${
          remaining <= 10
            ? "text-red-600"
            : "text-yellow-600"
        }`}
      >
        {minutes}:
        {seconds
          .toString()
          .padStart(2, "0")}
      </p>

    </div>
  );
};

export default HoldCountdown;