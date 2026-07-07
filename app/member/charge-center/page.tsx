'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { useI18n } from '@/components/providers/i18n-provider'
import { SiteContainer } from '@/components/site/container'

type BalanceResult = {
  own: number
  gift: number
  point: number
  validKey: string
}

function parseBalanceResponse(responseText: string): BalanceResult | null {
  const [status, payload] = responseText.split(':', 2)

  if (status !== '1' || !payload) {
    return null
  }

  const [own, gift, point, validKey] = payload.split(',')
  const parsedOwn = Number(own)
  const parsedGift = Number(gift)
  const parsedPoint = Number(point)

  if (!Number.isFinite(parsedOwn) || !Number.isFinite(parsedGift) || !Number.isFinite(parsedPoint) || !validKey) {
    return null
  }

  return {
    own: parsedOwn,
    gift: parsedGift,
    point: parsedPoint,
    validKey,
  }
}

function buildInputClass() {
  return 'w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[var(--legacy-accent-gold)]'
}

export default function ChargeCenterPage() {
  const { messages } = useI18n()
  const inputClass = useMemo(() => buildInputClass(), [])

  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUsername, setAuthUsername] = useState('')
  const [authError, setAuthError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  const [jid, setJid] = useState('')
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceRaw, setBalanceRaw] = useState('')
  const [balanceError, setBalanceError] = useState('')
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null)

  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseRaw, setPurchaseRaw] = useState('')
  const [purchaseForm, setPurchaseForm] = useState({
    orderNo: '',
    username: '',
    packageId: '',
    numSilk: '',
    eCash: '',
    secretStr: '',
    ip: '',
  })

  const [refundLoading, setRefundLoading] = useState(false)
  const [refundRaw, setRefundRaw] = useState('')
  const [refundForm, setRefundForm] = useState({
    refundNo: '',
    username: '',
    secondPassword: '',
    packageId: '',
    numSilk: '',
    eCash: '',
    secretStr: '',
    ip: '',
  })

  useEffect(() => {
    async function loadSession() {
      setAuthChecking(true)

      try {
        const response = await fetch('/api/member/session', { method: 'GET', cache: 'no-store' })
        const data = (await response.json()) as {
          authenticated?: boolean
          user?: { username?: string }
        }

        if (data.authenticated) {
          setIsAuthenticated(true)
          setAuthUsername(data.user?.username ?? '')
        } else {
          setIsAuthenticated(false)
          setAuthUsername('')
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setAuthChecking(false)
      }
    }

    void loadSession()
  }, [])

  async function readTextResponse(url: string, init?: RequestInit) {
    const response = await fetch(url, {
      method: 'GET',
      ...init,
    })
    return response.text()
  }

  async function handleBalanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBalanceError('')
    setBalanceRaw('')
    setBalanceResult(null)
    setBalanceLoading(true)

    try {
      const params = new URLSearchParams({ JID: jid })
      const raw = await readTextResponse(`/api/billing/silkdatacall?${params.toString()}`)

      if (raw === 'AUTH_REQUIRED') {
        setIsAuthenticated(false)
        setAuthError(messages.chargeCenter.authRequired)
      }

      setBalanceRaw(raw)

      const parsed = parseBalanceResponse(raw)

      if (!parsed) {
        setBalanceError(messages.chargeCenter.invalidBalanceResponse)
      } else {
        setBalanceResult(parsed)
      }
    } catch {
      setBalanceError(messages.chargeCenter.networkError)
    } finally {
      setBalanceLoading(false)
    }
  }

  async function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPurchaseLoading(true)
    setPurchaseRaw('')

    try {
      const payload = {
        OrderNo: purchaseForm.orderNo,
        Username: purchaseForm.username,
        Package: purchaseForm.packageId,
        NumSilk: purchaseForm.numSilk,
        ECash: purchaseForm.eCash,
        SecretStr: purchaseForm.secretStr,
        ...(purchaseForm.ip.trim() ? { IP: purchaseForm.ip.trim() } : {}),
      }

      const raw = await readTextResponse('/api/billing/purchase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (raw === 'AUTH_REQUIRED') {
        setIsAuthenticated(false)
        setAuthError(messages.chargeCenter.authRequired)
      }

      setPurchaseRaw(raw)
    } catch {
      setPurchaseRaw(messages.chargeCenter.networkError)
    } finally {
      setPurchaseLoading(false)
    }
  }

  async function handleRefundSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRefundLoading(true)
    setRefundRaw('')

    try {
      const payload = {
        RefundNo: refundForm.refundNo,
        Username: refundForm.username,
        Password: refundForm.secondPassword,
        Package: refundForm.packageId,
        NumSilk: refundForm.numSilk,
        ECash: refundForm.eCash,
        SecretStr: refundForm.secretStr,
        ...(refundForm.ip.trim() ? { IP: refundForm.ip.trim() } : {}),
      }

      const raw = await readTextResponse('/api/billing/refund', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (raw === 'AUTH_REQUIRED') {
        setIsAuthenticated(false)
        setAuthError(messages.chargeCenter.authRequired)
      }

      setRefundRaw(raw)
    } catch {
      setRefundRaw(messages.chargeCenter.networkError)
    } finally {
      setRefundLoading(false)
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    setLoginLoading(true)

    try {
      const response = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
        }),
      })

      const data = (await response.json()) as {
        ok?: boolean
        error?: string
        detail?: string
        user?: { username?: string }
      }

      if (!response.ok || !data.ok) {
        if (data.error === 'INVALID_CREDENTIALS') {
          setAuthError(messages.chargeCenter.invalidCredentials)
        } else if (data.detail === 'ESOCKET' || data.detail === 'ETIMEOUT' || data.detail === 'ECONNCLOSED') {
          setAuthError(messages.chargeCenter.loginDbUnavailable)
        } else {
          setAuthError(
            data.detail
              ? `${messages.chargeCenter.loginFailed} (${data.detail})`
              : messages.chargeCenter.loginFailed,
          )
        }

        return
      }

      setIsAuthenticated(true)
      setAuthUsername(data.user?.username ?? loginForm.username)
      setLoginForm({ username: '', password: '' })
    } catch {
      setAuthError(messages.chargeCenter.loginFailed)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/member/logout', { method: 'POST' })
    } finally {
      setIsAuthenticated(false)
      setAuthUsername('')
      setAuthError('')
      setBalanceRaw('')
      setBalanceResult(null)
      setBalanceError('')
      setPurchaseRaw('')
      setRefundRaw('')
    }
  }

  return (
    <SiteContainer>
      <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[var(--legacy-accent-gold)]/80 bg-[var(--legacy-panel-bg)]">
        <div className="flex min-h-[var(--legacy-main-top-height)] flex-col justify-center border-b border-[var(--legacy-accent-gold)]/80 px-5 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--legacy-accent-gold)]">{messages.chargeCenter.tag}</p>
          <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[36px]">{messages.chargeCenter.title}</h1>
          <p className="text-sm text-slate-300">{messages.chargeCenter.description}</p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-[var(--legacy-main-content-x)] sm:py-[var(--legacy-main-content-y)]">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
            {messages.chargeCenter.info}
          </div>

          {authChecking ? (
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
              {messages.chargeCenter.sessionChecking}
            </div>
          ) : null}

          {!authChecking && !isAuthenticated ? (
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-4 rounded-xl border border-[var(--legacy-panel-border)] bg-slate-950/70 p-4"
            >
              <div>
                <h2 className="text-base font-semibold text-white">{messages.chargeCenter.loginTitle}</h2>
                <p className="mt-1 text-xs text-slate-400">{messages.chargeCenter.loginDescription}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.username}
                  <input
                    required
                    value={loginForm.username}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.loginPassword}
                  <input
                    required
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    className={`${inputClass} mt-1`}
                  />
                </label>
              </div>

              {authError ? (
                <p className="rounded-md border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">{authError}</p>
              ) : null}

              <button
                type="submit"
                disabled={loginLoading}
                className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginLoading ? messages.chargeCenter.loggingIn : messages.chargeCenter.loginButton}
              </button>
            </form>
          ) : null}

          {!authChecking && isAuthenticated ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-200">
                {messages.chargeCenter.loggedAs}: <span className="font-semibold text-[var(--legacy-accent-gold)]">{authUsername}</span>
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[var(--legacy-accent-gold-hover)] hover:text-[var(--legacy-accent-gold-hover)]"
              >
                {messages.chargeCenter.logoutButton}
              </button>
            </div>
          ) : null}

          {!authChecking && isAuthenticated ? (
            <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleBalanceSubmit}
              className="space-y-4 rounded-xl border border-[var(--legacy-panel-border)] bg-slate-950/70 p-4"
            >
              <div>
                <h2 className="text-base font-semibold text-white">{messages.chargeCenter.balanceTitle}</h2>
                <p className="mt-1 text-xs text-slate-400">{messages.chargeCenter.balanceDescription}</p>
              </div>

              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.jid}
                <input
                  required
                  value={jid}
                  onChange={(event) => setJid(event.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="1001"
                />
              </label>

              <button
                type="submit"
                disabled={balanceLoading}
                className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {balanceLoading ? messages.chargeCenter.loading : messages.chargeCenter.queryBalance}
              </button>

              {balanceError ? (
                <p className="rounded-md border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">{balanceError}</p>
              ) : null}

              {balanceResult ? (
                <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-3 text-xs text-slate-200">
                  <p className="text-slate-300">{messages.chargeCenter.balanceResult}</p>
                  <p>{messages.chargeCenter.own}: {balanceResult.own}</p>
                  <p>{messages.chargeCenter.gift}: {balanceResult.gift}</p>
                  <p>{messages.chargeCenter.point}: {balanceResult.point}</p>
                </div>
              ) : null}

              {balanceRaw ? (
                <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                  {messages.chargeCenter.response}: {balanceRaw}
                </div>
              ) : null}
            </form>

            <form
              onSubmit={handlePurchaseSubmit}
              className="space-y-4 rounded-xl border border-[var(--legacy-panel-border)] bg-slate-950/70 p-4"
            >
              <div>
                <h2 className="text-base font-semibold text-white">{messages.chargeCenter.purchaseTitle}</h2>
                <p className="mt-1 text-xs text-slate-400">{messages.chargeCenter.purchaseDescription}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.orderNo}
                  <input required value={purchaseForm.orderNo} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, orderNo: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.username}
                  <input required value={purchaseForm.username} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, username: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.package}
                  <input required value={purchaseForm.packageId} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, packageId: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.numSilk}
                  <input required value={purchaseForm.numSilk} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, numSilk: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.eCash}
                  <input required value={purchaseForm.eCash} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, eCash: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  {messages.chargeCenter.requestIp}
                  <input value={purchaseForm.ip} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, ip: event.target.value }))} className={`${inputClass} mt-1`} />
                </label>
              </div>

              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.secretStr}
                <input required value={purchaseForm.secretStr} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, secretStr: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>

              <button
                type="submit"
                disabled={purchaseLoading}
                className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {purchaseLoading ? messages.chargeCenter.loading : messages.chargeCenter.submitPurchase}
              </button>

              {purchaseRaw ? (
                <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                  {messages.chargeCenter.response}: {purchaseRaw}
                </div>
              ) : null}
            </form>
            </div>
          ) : null}

          {!authChecking && isAuthenticated ? (
            <form
            onSubmit={handleRefundSubmit}
            className="space-y-4 rounded-xl border border-[var(--legacy-panel-border)] bg-slate-950/70 p-4"
          >
            <div>
              <h2 className="text-base font-semibold text-white">{messages.chargeCenter.refundTitle}</h2>
              <p className="mt-1 text-xs text-slate-400">{messages.chargeCenter.refundDescription}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.refundNo}
                <input required value={refundForm.refundNo} onChange={(event) => setRefundForm((prev) => ({ ...prev, refundNo: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.username}
                <input required value={refundForm.username} onChange={(event) => setRefundForm((prev) => ({ ...prev, username: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.secondPassword}
                <input required value={refundForm.secondPassword} onChange={(event) => setRefundForm((prev) => ({ ...prev, secondPassword: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.package}
                <input required value={refundForm.packageId} onChange={(event) => setRefundForm((prev) => ({ ...prev, packageId: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.numSilk}
                <input required value={refundForm.numSilk} onChange={(event) => setRefundForm((prev) => ({ ...prev, numSilk: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.eCash}
                <input required value={refundForm.eCash} onChange={(event) => setRefundForm((prev) => ({ ...prev, eCash: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {messages.chargeCenter.requestIp}
                <input value={refundForm.ip} onChange={(event) => setRefundForm((prev) => ({ ...prev, ip: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 lg:col-span-1">
                {messages.chargeCenter.secretStr}
                <input required value={refundForm.secretStr} onChange={(event) => setRefundForm((prev) => ({ ...prev, secretStr: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
            </div>

            <button
              type="submit"
              disabled={refundLoading}
              className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refundLoading ? messages.chargeCenter.loading : messages.chargeCenter.submitRefund}
            </button>

            {refundRaw ? (
              <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                {messages.chargeCenter.response}: {refundRaw}
              </div>
            ) : null}
            </form>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-[var(--legacy-accent-gold)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[var(--legacy-accent-gold-hover)]"
            >
              {messages.chargeCenter.backHome}
            </Link>
            <Link
              href="/member/register"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[var(--legacy-accent-gold-hover)] hover:text-[var(--legacy-accent-gold-hover)]"
            >
              {messages.chargeCenter.registerAccount}
            </Link>
          </div>
        </div>
      </section>
    </SiteContainer>
  )
}
