"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export default function RegistroPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);

  const register = api.auth.register.useMutation({
    onSuccess: async () => {
      // Auto-login luego del registro
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    register.mutate({
      name: form.name,
      businessName: form.businessName,
      email: form.email,
      password: form.password,
    });
  }

  const isLoading = register.isPending;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Crear cuenta
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Tu nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Juan García"
          />
        </div>

        <div>
          <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-gray-700">
            Nombre del negocio
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            value={form.businessName}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="La Parrilla de Juan"
          />
          {form.businessName && (
            <p className="mt-1 text-xs text-gray-400">
              Tu menú estará en: <span className="font-medium text-gray-600">/menu/...</span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Creando cuenta..." : "Crear cuenta gratis"}
        </button>

        <p className="text-center text-xs text-gray-400">
          14 días de prueba gratis. Sin tarjeta de crédito.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
