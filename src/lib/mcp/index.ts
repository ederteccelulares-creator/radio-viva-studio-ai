import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getStation from "./tools/get-station";
import listSchedule from "./tools/list-schedule";
import listQueue from "./tools/list-queue";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";
export default defineMcp({
  name: "sintonia-radio-viva", title: "Sintonia Radio Viva", version: "0.1.0",
  instructions: "Ferramentas de consulta da rádio. Consulte informações da estação, programação e fila pública. As consultas respeitam as permissões da conta conectada. Não há ferramentas para alterar configurações ou enviar pedidos.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated", requireOAuthClientClaim: true }),
  tools: [getStation, listSchedule, listQueue],
});