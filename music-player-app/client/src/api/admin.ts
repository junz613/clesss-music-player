import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000
});

export type AdminSession = {
  role: "admin";
  expiresAt: string;
};

export type AdminLoginResponse = {
  data: AdminSession & {
    token: string;
  };
};

export type AdminUploadedSong = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  folder: string;
  fileName: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  playUrl: string;
};

export async function loginAdmin(password: string) {
  const response = await api.post<AdminLoginResponse>("/admin/login", {
    password
  });

  return response.data;
}

export async function fetchAdminSession(token: string) {
  const response = await api.get<{ data: AdminSession }>("/admin/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
}

export async function uploadAdminSong(token: string, payload: { file: File; folder: string }) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("folder", payload.folder);

  const response = await api.post<{ data: AdminUploadedSong }>("/admin/songs", formData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
}
