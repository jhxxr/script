
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-proxy-target, x-anthropic-version, anthropic-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)

        // 2. Read Request Body First (needed for logging later, and we need headers)
        const requestMethod = req.method
        const requestHeaders = Object.fromEntries(req.headers.entries())

        // Define Alias Map
        const ENDPOINT_MAP: Record<string, string> = {
            'anthropic': 'https://api.anthropic.com',
            'openai': 'https://api.openai.com',
            'deepseek': 'https://api.deepseek.com',
            'gemini': 'https://generativelanguage.googleapis.com',
            'groq': 'https://api.groq.com/openai',
            'xrapi': 'https://api.nextxr.site',
            'echo': 'https://echo.free.beeceptor.com'
        }

        // 1. Determine Target URL
        let targetBase = req.headers.get('x-proxy-target') || url.searchParams.get('_target')
        let proxyPath = url.pathname // fallback default

        const pathSegments = url.pathname.split('/').filter(Boolean)
        // pathSegments: ["functions", "v1", "capture", "xrapi", "v1"...] or ["functions", "v1", "capture", "v1"...]

        if (!targetBase) {
            // Logic: Find first segment matching an alias
            let aliasIndex = -1
            let matchedAlias = ''

            for (let i = 0; i < pathSegments.length; i++) {
                if (ENDPOINT_MAP[pathSegments[i]]) {
                    aliasIndex = i
                    matchedAlias = pathSegments[i]
                    break
                }
            }

            if (aliasIndex !== -1) {
                // Found alias
                targetBase = ENDPOINT_MAP[matchedAlias]
                // Path is everything after alias
                proxyPath = '/' + pathSegments.slice(aliasIndex + 1).join('/')
            } else {
                // Fallback: Default to Anthropic
                targetBase = 'https://api.anthropic.com'

                // Try to strip function prefix logic
                // If path starts with /functions/v1/capture, strip it.
                // Or if it contains 'capture', strip it.
                // Or if we see 'v1' or 'chat', start there.

                const funcNameIndex = pathSegments.indexOf('capture')
                if (funcNameIndex !== -1) {
                    proxyPath = '/' + pathSegments.slice(funcNameIndex + 1).join('/')
                } else {
                    // Aggressive stripping if we can't find 'capture' naming convention
                    // If we are at /functions/v1/... (3 segments)
                    if (pathSegments.length >= 3 && pathSegments[0] === 'functions' && pathSegments[1] === 'v1') {
                        proxyPath = '/' + pathSegments.slice(3).join('/')
                    }
                }
            }
        } else {
            // Explicit target provided, just strip the function wrapper
            const funcNameIndex = pathSegments.indexOf('capture')
            if (funcNameIndex !== -1) {
                proxyPath = '/' + pathSegments.slice(funcNameIndex + 1).join('/')
            }
        }

        // Construct final URL
        const normalizedTargetBase = targetBase.replace(/\/$/, '')
        const normalizedProxyPath = proxyPath.replace(/^\//, '')
        // Ensure we don't end up with double slash or no slash
        const targetUrl = new URL(normalizedProxyPath, normalizedTargetBase + '/').toString() + url.search

        // Clone request to read body without consuming it for the fetch
        const reqClone = req.clone()
        let requestBody = null
        const contentType = requestHeaders['content-type'] || ''

        if (contentType.includes('application/json') || contentType.includes('text/')) {
            try {
                requestBody = await reqClone.text()
            } catch (e) {
                console.error("Error reading request body", e)
            }
        }

        // 3. Forward Request
        const forwardHeaders = new Headers(req.headers)
        forwardHeaders.delete('host')
        forwardHeaders.delete('x-proxy-target')

        console.log(`Proxying ${requestMethod} to ${targetUrl}`)

        const startTime = Date.now()
        let response
        let responseBody = null
        let responseStatus = 0
        let responseHeaders = {}

        try {
            response = await fetch(targetUrl, {
                method: requestMethod,
                headers: forwardHeaders,
                body: req.body // stream the original body
            })

            responseStatus = response.status
            responseHeaders = Object.fromEntries(response.headers.entries())

            // 4. Read Response Body
            const contentTypeRes = responseHeaders['content-type'] || ''
            const isStreaming = contentTypeRes.includes('text/event-stream')

            if (isStreaming) {
                responseBody = "[STREAMING RESPONSE]"
            } else if (contentTypeRes.includes('application/json') || contentTypeRes.includes('text/')) {
                const resClone = response.clone()
                try {
                    responseBody = await resClone.text()
                } catch (e) {
                    responseBody = "[Error reading response body]"
                }
            }
        } catch (err) {
            console.error("Fetch error:", err)
            responseStatus = 502
            responseBody = `Error connecting to upstream: ${err.message}`
            response = new Response(responseBody, { status: 502 })
        }

        const duration = Date.now() - startTime

        // 5. Log to Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Use Service Role for logging to ensure we have permission to create buckets if needed
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Try DB insert first
        // Use supabaseAdmin (Service Role) to bypass RLS policies just in case
        const { error: dbError } = await supabaseAdmin.from('api_logs').insert({
            method: requestMethod,
            url: targetUrl,
            request_headers: requestHeaders,
            request_body: requestBody,
            response_status: responseStatus,
            response_headers: responseHeaders,
            response_body: responseBody,
            duration_ms: duration,
            client_ip: requestHeaders['x-forwarded-for'] || null
        })

        if (dbError) {
            console.warn('DB Logging failed (table missing?), falling back to Storage:', dbError.message)

            // Fallback: Upload to Storage Wrapper
            try {
                const bucketName = 'capture_logs'
                // Ensure bucket exists (idempotent-ish check)
                // Note: getBucket is cheap, createBucket might fail if exists
                const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket(bucketName)

                if (bucketError && bucketError.message.includes('not found')) {
                    await supabaseAdmin.storage.createBucket(bucketName, { public: false })
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                const logEntry = {
                    metadata: {
                        method: requestMethod,
                        url: targetUrl,
                        status: responseStatus,
                        duration,
                        ip: requestHeaders['x-forwarded-for']
                    },
                    request: {
                        headers: requestHeaders,
                        body: requestBody
                    },
                    response: {
                        headers: responseHeaders,
                        body: responseBody
                    }
                }

                const filePath = `${timestamp}_${crypto.randomUUID().slice(0, 8)}.json`

                await supabaseAdmin.storage
                    .from(bucketName)
                    .upload(filePath, JSON.stringify(logEntry, null, 2), {
                        contentType: 'application/json'
                    })

            } catch (storageErr) {
                console.error('Storage fallback also failed:', storageErr)
            }
        }

        return response

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
