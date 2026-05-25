import { useState, useEffect } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  "17825452380-iol1f1b59suivj72en43q31s5l5uq985.apps.googleusercontent.com";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export function useGoogleCalendar() {
  const [googleToken, setGoogleToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectUri = "http://localhost:8081";

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: [CALENDAR_SCOPE],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    discovery,
  );

  useEffect(() => {
    naloziToken();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const token = response.authentication?.accessToken;
      if (token) {
        SecureStore.setItemAsync("google_calendar_token", token);
        setGoogleToken(token);
      }
    }
  }, [response]);

  const naloziToken = async () => {
    const token = await SecureStore.getItemAsync("google_calendar_token");
    if (token) setGoogleToken(token);
  };

  const povezi = async () => {
    setLoading(true);
    try {
      console.log("REDIRECT URI:", redirectUri);
      const result = await promptAsync();
      console.log("AUTH RESULT:", JSON.stringify(result));
    } finally {
      setLoading(false);
    }
  };

  const odklopi = async () => {
    if (googleToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${googleToken}`,
          {
            method: "POST",
          },
        );
      } catch {}
    }
    await SecureStore.deleteItemAsync("google_calendar_token");
    setGoogleToken(null);
  };

  const dodajVoznjovVKolendar = async (voznja) => {
    if (!googleToken) return false;

    try {
      const zacetek = new Date(voznja.zacetek);
      const konec = new Date(voznja.konc);

      const dogodek = {
        summary: `Vožnja${voznja.stranka ? `: ${voznja.stranka}` : ""}`,
        description: [
          voznja.relacija ? `Relacija: ${voznja.relacija}` : null,
          voznja.opis ? `Opis: ${voznja.opis}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        start: {
          dateTime: zacetek.toISOString(),
          timeZone: "Europe/Ljubljana",
        },
        end: {
          dateTime: konec.toISOString(),
          timeZone: "Europe/Ljubljana",
        },
        colorId: "1",
      };

      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dogodek),
        },
      );

      if (res.status === 401) {
        await odklopi();
        return false;
      }

      return res.ok;
    } catch {
      return false;
    }
  };

  return {
    googleToken,
    loading,
    jePovedzan: !!googleToken,
    povezi,
    odklopi,
    dodajVoznjovVKolendar,
  };
}
