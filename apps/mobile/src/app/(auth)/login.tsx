import { FormularioCuenta } from "@/components/formulario-cuenta";

/** Entrar con una cuenta existente (email y contraseña). Alta en `registro`. */
export default function Login() {
  return <FormularioCuenta modo="entrar" />;
}
