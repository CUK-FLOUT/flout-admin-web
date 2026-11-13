import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export default function WorkClock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: number | undefined;
    const update = () => setNow(Date.now());
    const start = () => {
      if (document.visibilityState !== "hidden")
        timer = window.setInterval(update, 1000);
    };

    const onVisibilityChange = () => {
      window.clearInterval(timer);
      if (document.visibilityState !== "hidden") {
        update();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;

  return (
    <time className="max-sm:hidden" dateTime={new Date(now).toISOString()}>
      업무일자: {date}
    </time>
  );
}
