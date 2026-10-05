/** localStorage erişimi gizli pencere/kısıtlı ortamlarda hata fırlatabilir. */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null): void {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* yoksay */
    }
  },
};

/** Sekme ömrü boyunca tutulan değerler (ör. PayTR iframe URL'i). */
export const sessionStore = {
  get(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null): void {
    try {
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch {
      /* yoksay */
    }
  },
};

export const paymentUrlKey = (orderNo: string) => `he.payment.${orderNo}`;

export const STORAGE_KEYS = {
  accessToken: 'he.accessToken',
  refreshToken: 'he.refreshToken',
  cartToken: 'he.cartToken',
} as const;
