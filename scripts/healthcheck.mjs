try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`, { signal: AbortSignal.timeout(4000) });
  const result = await response.json();
  if (!response.ok || result.status !== 'ok') process.exitCode = 1;
} catch { process.exitCode = 1; }
