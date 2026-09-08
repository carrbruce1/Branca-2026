import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const { email, nombre, estado, motivo } = await req.json();

    const esAprobado = estado === "aprobado";

    const asunto = esAprobado 
      ? "¡Tu cuenta ha sido Aprobada!" 
      : "Estado de tu registro en el Restaurante";

    const mensajeHtml = esAprobado
      ? `<h2>¡Bienvenido/a, ${nombre}!</h2><p>Tu cuenta fue aprobada por la administración. Ya podés ingresar a la app y realizar pedidos.</p>`
      : `<h2>Hola, ${nombre}</h2><p>Lamentamos informarte que tu solicitud de registro fue rechazada.</p><p><strong>Motivo:</strong> ${motivo || "No especificado"}</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Restaurante <onboarding@resend.dev>",
        to: [email],
        subject: asunto,
        html: mensajeHtml,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});