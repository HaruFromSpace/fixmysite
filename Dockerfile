# Official Playwright image: Node plus Chromium and the system libraries it needs.
# Keep the version in sync with "playwright" in package.json.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
USER pwuser
EXPOSE 3000
CMD ["node", "server.js"]
