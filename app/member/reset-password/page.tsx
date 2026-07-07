'use client'

import { useState } from 'react'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

type ResetPasswordResponse = {
  ok: boolean
  error?: string
}

function getErrorMessage(
  errorCode: string | undefined,
  msgs: ReturnType<typeof useI18n>['messages']['resetPassword'],
) {
  if (!errorCode) {
    return msgs.genericError
  }

  const known = msgs.errors[errorCode as keyof typeof msgs.errors]

  if (known) {
    return known
  }

  return `Error: ${errorCode}`
}

export default function ResetPasswordPage() {
  const { messages } = useI18n()
  const msgs = messages.resetPassword

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaSeed, setCaptchaSeed] = useState(() => Date.now())
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function refreshCaptcha() {
    setCaptchaSeed(Date.now())
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/member/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, captcha }),
      })

      const payload = (await response.json()) as ResetPasswordResponse

      if (!response.ok || !payload.ok) {
        setIsError(true)
        setMessage(getErrorMessage(payload.error, msgs))
        setCaptcha('')
        refreshCaptcha()
        return
      }

      setIsError(false)
      setMessage(msgs.success)
      setDone(true)
    } catch {
      setIsError(true)
      setMessage(msgs.networkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SiteContainer>
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--legacy-accent-gold)]/80 bg-[var(--legacy-panel-bg)]">
        <div className="flex min-h-[var(--legacy-main-top-height)] flex-col justify-center border-b border-[var(--legacy-accent-gold)]/80 px-5 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--legacy-accent-gold)]">{msgs.step}</p>
          <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[36px]">{msgs.title}</h1>
          <p className="text-sm text-slate-300">{msgs.description}</p>
        </div>

        <form className="space-y-4 px-5 py-6 sm:px-[var(--legacy-main-content-x)] sm:py-[var(--legacy-main-content-y)]" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{msgs.username}</span>
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={done}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-[var(--legacy-accent-gold)] transition focus:ring disabled:opacity-50"
              placeholder={msgs.usernamePlaceholder}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{msgs.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={done}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-[var(--legacy-accent-gold)] transition focus:ring disabled:opacity-50"
              placeholder="name@example.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{msgs.password}</span>
            <input
              required
              type="password"
              minLength={6}
              maxLength={48}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={done}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-[var(--legacy-accent-gold)] transition focus:ring disabled:opacity-50"
              placeholder={msgs.passwordPlaceholder}
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{msgs.captcha}</span>
            <div className="flex items-center gap-3">
              <img
                src={`/api/captcha?ts=${captchaSeed}`}
                alt="captcha"
                className="h-10 w-[150px] rounded border border-slate-600 bg-slate-200"
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={done}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800 hover:text-[var(--legacy-accent-gold-hover)] disabled:opacity-50"
              >
                {msgs.refresh}
              </button>
            </div>
            <input
              required
              value={captcha}
              onChange={(event) => setCaptcha(event.target.value)}
              disabled={done}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-[var(--legacy-accent-gold)] transition focus:ring disabled:opacity-50"
              placeholder={msgs.captchaPlaceholder}
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          {message && (
            <p className={`rounded-lg px-4 py-3 text-sm ${isError ? 'bg-red-950/60 text-red-300' : 'bg-emerald-950/60 text-emerald-300'}`}>
              {message}
            </p>
          )}

          {!done && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)] disabled:opacity-60"
            >
              {isSubmitting ? msgs.submitting : msgs.submit}
            </button>
          )}
        </form>
      </section>
    </SiteContainer>
  )
}
