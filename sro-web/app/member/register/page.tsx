'use client'

import { useState } from 'react'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

type RegisterResponse = {
  ok: boolean
  error?: string
}

function getRegisterErrorMessage(
  errorCode: string | undefined,
  registerMessages: ReturnType<typeof useI18n>['messages']['register'],
) {
  if (!errorCode) {
    return registerMessages.genericError
  }

  const knownMessage = registerMessages.errors[errorCode as keyof typeof registerMessages.errors]

  if (knownMessage) {
    return knownMessage
  }

  return `Error: ${errorCode}`
}

export default function RegisterPage() {
  const { messages } = useI18n()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaSeed, setCaptchaSeed] = useState(() => Date.now())
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function refreshCaptcha() {
    setCaptchaSeed(Date.now())
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, captcha }),
      })

      const payload = (await response.json()) as RegisterResponse

      if (!response.ok || !payload.ok) {
        setIsError(true)
        setMessage(getRegisterErrorMessage(payload.error, messages.register))
        return
      }

      setIsError(false)
      setMessage(messages.register.success)
      setUsername('')
      setPassword('')
      setEmail('')
      setCaptcha('')
      refreshCaptcha()
    } catch {
      setIsError(true)
      setMessage(messages.register.networkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SiteContainer>
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--legacy-accent-gold)]/80 bg-[var(--legacy-panel-bg)]">
        <div className="flex min-h-[var(--legacy-main-top-height)] flex-col justify-center border-b border-[var(--legacy-accent-gold)]/80 px-5 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--legacy-accent-cyan)]">{messages.register.step}</p>
          <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[36px]">{messages.register.title}</h1>
          <p className="text-sm text-slate-300">{messages.register.description}</p>
        </div>

        <form className="space-y-4 px-5 py-6 sm:px-[var(--legacy-main-content-x)] sm:py-[var(--legacy-main-content-y)]" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{messages.register.username}</span>
            <input
              required
              minLength={4}
              maxLength={16}
              pattern="[A-Za-z0-9]+"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring"
              placeholder={messages.register.usernamePlaceholder}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{messages.register.password}</span>
            <input
              required
              type="password"
              minLength={6}
              maxLength={48}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring"
              placeholder={messages.register.passwordPlaceholder}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{messages.register.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring"
              placeholder="name@example.com"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{messages.register.captcha}</span>
            <div className="flex items-center gap-3">
              <img
                src={`/api/captcha?ts=${captchaSeed}`}
                alt="captcha"
                className="h-10 w-[150px] rounded border border-slate-600 bg-slate-200"
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800 hover:text-[var(--legacy-accent-cyan)]"
              >
                {messages.register.refresh}
              </button>
            </div>
            <input
              required
              value={captcha}
              onChange={(event) => setCaptcha(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring"
              placeholder={messages.register.captchaPlaceholder}
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg bg-[var(--legacy-accent-cyan)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isSubmitting ? messages.register.creating : messages.register.createAccount}
          </button>
          {message ? (
            <p className={isError ? 'text-sm text-rose-300' : 'text-sm text-emerald-300'}>{message}</p>
          ) : null}
        </form>
      </section>
    </SiteContainer>
  )
}
