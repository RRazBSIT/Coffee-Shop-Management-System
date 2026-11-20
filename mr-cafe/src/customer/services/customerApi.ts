
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export type CustomerAuthData = {
  customerId: number;
  fullName: string;
  email: string;
  phone: string | null;
  accountType: 'customer';
  token: string;
};

async function request(endpoint: string, body: object) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong.');
  }

  return result.data as CustomerAuthData;
}

export function customerLogin(email: string, password: string) {
  return request('/auth/customer/login', { email, password });
}

export function customerRegister(data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return request('/auth/register', data);
}
