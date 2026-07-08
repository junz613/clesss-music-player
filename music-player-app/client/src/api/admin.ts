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
