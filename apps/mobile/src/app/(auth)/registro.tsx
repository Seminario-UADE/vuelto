import { FormularioCuenta } from "@/components/formulario-cuenta";

/** Crear una cuenta (email y contraseña). Quien ya tiene una entra por `login`. */
export default function Registro() {
  return <FormularioCuenta modo="registro" />;
}
