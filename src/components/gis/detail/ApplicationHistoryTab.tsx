import type { GisHistories } from "../../../api/gisApplications";

type Props = {
  histories: GisHistories | undefined;
  error: string | undefined;
};

export default function ApplicationHistoryTab({ histories, error }: Props) {
  return (
    <ol className="space-y-4 text-sm leading-6">
      {(histories?.histories ?? []).map((item) => (
        <li key={item.eventId} className="border-l-2 border-[#234f73] pl-3">
          <p>
            {item.title} · {item.statusLabel}
          </p>
          {item.description && <p>{item.description}</p>}
          <p>
            {item.occurredAt
              ? new Date(item.occurredAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })
              : "시각 미기록"}{" "}
            · {item.actorName || "처리자 미기록"}
          </p>
        </li>
      ))}
      {!error &&
        (histories ? (
          !histories.histories.length && <li>등록된 처리 이력이 없습니다.</li>
        ) : (
          <li>처리 이력을 불러오는 중입니다.</li>
        ))}
    </ol>
  );
}
