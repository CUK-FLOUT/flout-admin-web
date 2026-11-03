interface PromptNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
}

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select: boolean;
  }): void;
  prompt(callback: (notification: PromptNotification) => void): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

let sdkFlight: Promise<GoogleIdentity> | null = null;
let initialized = false;
let pending: {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
} | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id);
  if (sdkFlight) return sdkFlight;
  sdkFlight = new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    const script = existing ?? document.createElement("script");
    const finish = (error?: Error) => {
      clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (error) {
        script.remove();
        sdkFlight = null;
        reject(error);
      } else if (window.google?.accounts.id) resolve(window.google.accounts.id);
      else {
        script.remove();
        sdkFlight = null;
        reject(new Error("Google 인증을 초기화하지 못했습니다."));
      }
    };

    const onLoad = () => finish();
    const onError = () =>
      finish(
        new Error("Google 인증을 불러오지 못했습니다. 다시 시도해 주세요."),
      );
    const timer = window.setTimeout(onError, 15000);

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      document.head.append(script);
    }
  });

  return sdkFlight;
}

export async function requestGoogleIdToken(
  signal?: AbortSignal,
): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  if (!clientId)
    throw new Error(
      "Google 로그인 설정이 필요합니다. VITE_GOOGLE_CLIENT_ID를 확인해 주세요.",
    );
  const identity = await loadGoogleIdentity();

  if (signal?.aborted) throw new Error("Google 로그인이 취소되었습니다.");
  if (!initialized) {
    identity.initialize({
      client_id: clientId,
      auto_select: false,
      callback: ({ credential }) => {
        if (credential && credential.length <= 16384)
          pending?.resolve(credential);
        else
          pending?.reject(
            new Error("Google ID 토큰을 받지 못했습니다. 다시 시도해 주세요."),
          );
      },
    });
    initialized = true;
  }

  if (pending) throw new Error("Google 로그인이 이미 진행 중입니다.");

  return new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      pending = null;
    };

    const fail = (error: Error) => {
      cleanup();
      identity.cancel();
      reject(error);
    };

    const onAbort = () => fail(new Error("Google 로그인이 취소되었습니다."));
    const timer = window.setTimeout(
      () =>
        fail(
          new Error(
            "Google 인증을 완료하지 못했습니다. 브라우저의 Google 로그인 허용 설정을 확인하거나 이메일로 로그인해 주세요.",
          ),
        ),
      90000,
    );

    pending = {
      resolve: (token) => {
        cleanup();
        resolve(token);
      },
      reject: fail,
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      identity.prompt((notification) => {
        if (!pending) return;
        if (
          notification.isNotDisplayed() ||
          notification.isSkippedMoment() ||
          (notification.isDismissedMoment() &&
            notification.getDismissedReason() !== "credential_returned")
        ) {
          fail(
            new Error(
              "Google 로그인이 취소되었거나 표시되지 않았습니다. 브라우저 설정을 확인하거나 이메일로 로그인해 주세요.",
            ),
          );
        }
      });
    } catch {
      fail(new Error("Google 인증을 시작하지 못했습니다. 다시 시도해 주세요."));
    }
  });
}
