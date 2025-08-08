export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();

    // 1) Verify Turnstile
    const token = form.get('cf-turnstile-response');
    const ip = request.headers.get('CF-Connecting-IP');
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: ip || ''
      })
    }).then(r => r.json());

    if (!verifyRes.success) {
      return new Response(JSON.stringify({ ok:false, reason:'turnstile_failed', verifyRes }), {
        status: 400, headers: { 'content-type': 'application/json' }
      });
    }

    // 2) Forward to Formspree (or swap for Resend/Postmark)
    // Keep only the fields you want to send:
    const forward = new FormData();
    forward.set('email', form.get('email') || '');
    forward.set('message', form.get('message') || '');
    forward.set('_subject', 'Gold Shore Contact');

    const fsRes = await fetch(env.FORMSPREE_ENDPOINT, { method:'POST', body: forward });
    if (!fsRes.ok) {
      const txt = await fsRes.text();
      return new Response(JSON.stringify({ ok:false, reason:'formspree_error', txt }), {
        status: 502, headers: { 'content-type': 'application/json' }
      });
    }

    // 3) Redirect back with a success hash (or return JSON)
    return Response.redirect('/#contact-success', 303);

  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error:String(err) }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}