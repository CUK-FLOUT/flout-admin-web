import type { RefObject } from "react";

import InfrastructureImage from "../../components/infrastructure/InfrastructureImage";
import InfrastructureSelect from "../../components/infrastructure/InfrastructureSelect";
import {
  infrastructureCard,
  infrastructureInput,
  infrastructurePrimary,
} from "../../components/infrastructure/styles";
import { infrastructureAssets as assets } from "./assets";
import type { FacilityDraft, InfrastructureIssue } from "./types";

type Props = {
  issue: InfrastructureIssue;
  draft: FacilityDraft;
  busy: boolean;
  readOnly: boolean;
  file: RefObject<HTMLInputElement | null>;
  onUpdate: <K extends keyof FacilityDraft>(key: K, value: FacilityDraft[K]) => void;
  onSave: (status: boolean) => void;
  onComplete: () => void;
  onUpload: (files: File[]) => Promise<void>;
};

export default function InfrastructureReviewPanel({
  issue,
  draft,
  busy,
  readOnly,
  file,
  onUpdate: update,
  onSave: save,
  onComplete: requestComplete,
  onUpload: upload,
}: Props) {
  return (
        <aside
          aria-label="공공시설 검토 및 조치"
          className={infrastructureCard + " min-h-[671px] min-w-0"}
        >
          <section className="relative min-h-[310px] px-[15.25px] pt-[19.25px] pb-[25px]">
            <h2 className="flex items-center gap-3 text-base font-bold leading-6">
              <img src={assets.facilityReview} alt="" width={22} height={22} />
              공공시설 점검·행정 검토
            </h2>
            <label className="mt-3 grid min-h-[46px] grid-cols-[minmax(0,1fr)_minmax(0,240px)] items-center gap-3 text-sm font-bold leading-[21px]">
              검토 대상
              <input
                aria-label="검토 대상"
                readOnly={readOnly}
                value={draft.target}
                onChange={(e) => update("target", e.target.value)}
                className={
                  infrastructureInput +
                  " h-[46px] px-[15px] text-sm font-normal"
                }
              />
            </label>
            <div className="mt-[17px] flex items-center justify-between gap-2">
              <label
                htmlFor="facility-requirements"
                className="text-sm font-bold leading-[21px]"
              >
                점검 필요사항
              </label>
              {!readOnly && (
                <button
                  onClick={() => save(false)}
                  className="text-xs leading-[21px] text-[#234f73] underline underline-offset-2"
                >
                  점검 필요사항 등록
                </button>
              )}
            </div>
            <textarea
              id="facility-requirements"
              readOnly={readOnly}
              value={draft.requirements}
              onChange={(e) => update("requirements", e.target.value)}
              className={
                infrastructureInput +
                " mt-[11px] h-[68px] min-h-[68px] resize-y p-3 text-sm leading-[21px]"
              }
            />
            <div className="mt-[19px] grid grid-cols-2 gap-[10px]">
              <InfrastructureSelect
                label="공공시설 검토 상태"
                value={readOnly ? issue.status : draft.status}
                options={["검토 대기", "검토 중"]}
                review
                disabled={readOnly}
                onChange={(value) =>
                  update("status", value as FacilityDraft["status"])
                }
              />
              <button
                disabled={readOnly || busy}
                onClick={() => save(true)}
                className={infrastructurePrimary + " h-[46px] rounded-md"}
              >
                상태 저장
              </button>
            </div>
          </section>
          <section className="min-h-[360px] border-t-[0.75px] border-[#c8d0d7] px-[15.25px] pt-[23.25px] pb-[30px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-3 text-base font-bold leading-6">
                <img
                  src={assets.actionComplete}
                  alt=""
                  width={22}
                  height={22}
                />
                공공시설 조치 완료
              </h2>
              {!readOnly && (
                <button
                  disabled={busy}
                  onClick={() => file.current?.click()}
                  className="text-xs text-[#234f73] underline underline-offset-2"
                >
                  사진 첨부
                </button>
              )}
            </div>
            <textarea
              aria-label="조치 결과"
              readOnly={readOnly}
              placeholder="실제 점검·조치 결과를 입력하세요."
              value={draft.result}
              onChange={(e) => update("result", e.target.value)}
              className={
                infrastructureInput +
                " mt-4 h-[43px] min-h-[43px] resize-y p-[11px] text-sm leading-[21px] placeholder:text-[#94a3b8]"
              }
            />
            <div className="mt-5 flex h-[92px] gap-4 overflow-x-auto px-0.5">
              {draft.photos.map((photo) => (
                <figure key={photo.id} className="w-32 shrink-0">
                  <div className="relative h-[68px] overflow-hidden rounded-[7px] border-[0.75px] border-[#c8d0d7]">
                    <InfrastructureImage
                      source={photo.src}
                      alt={"조치 사진 " + photo.name}
                      className="h-full w-full object-cover"
                    />
                    {!readOnly && (
                      <button
                        aria-label={photo.name + " 삭제"}
                        disabled={busy}
                        onClick={() =>
                          update(
                            "photos",
                            draft.photos.filter((p) => p.id !== photo.id),
                          )
                        }
                        className="absolute top-[5.25px] right-[5.25px] size-[22px]"
                      >
                        <img
                          src={assets.removePhoto}
                          alt=""
                          width={22}
                          height={22}
                        />
                      </button>
                    )}
                  </div>
                  <figcaption className="mt-[6px] truncate text-[13px] font-medium leading-[18px]">
                    {photo.name}
                  </figcaption>
                </figure>
              ))}
              {!draft.photos.length && (
                <button
                  disabled={busy || readOnly}
                  onClick={() => file.current?.click()}
                  className="h-[68px] w-32 shrink-0 rounded-[7px] border border-dashed border-[#c8d0d7] text-xs text-[#596672]"
                >
                  {busy ? "사진 저장 중…" : "+ 조치 사진 첨부"}
                </button>
              )}
            </div>
            <input
              ref={file}
              aria-label="조치 사진 파일"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              disabled={busy || readOnly}
              className="sr-only"
              onChange={(e) => {
                void upload(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <label className="mt-[19px] flex items-center gap-2 px-0.5 text-sm leading-[21px]">
              <input
                type="checkbox"
                aria-label="공공시설 조치·결과 확인 완료"
                disabled={readOnly}
                checked={draft.verified}
                onChange={(e) => update("verified", e.target.checked)}
                className="size-3.5 shrink-0 accent-[#234f73]"
              />
              공공시설 조치·결과 확인 완료
            </label>
            <button
              disabled={readOnly || busy}
              onClick={requestComplete}
              className={
                infrastructurePrimary +
                " mt-[22px] h-12 w-full rounded-md text-base"
              }
            >
              {readOnly ? "조치 완료" : "조치 완료 처리"}
            </button>
          </section>
        </aside>
  );
}
