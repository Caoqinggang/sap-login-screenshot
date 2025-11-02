const { chromium } = require("playwright");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { execSync } = require("child_process");

async function sendToTelegram(filePath, caption) {
  const telegramApi = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();
  formData.append("chat_id", process.env.TELEGRAM_CHAT_ID);
  formData.append("caption", caption);
  formData.append("photo", fs.createReadStream(filePath));

  await axios.post(telegramApi, formData, {
    headers: formData.getHeaders(),
  });
}

(async () => {
  const SELECTORS = {
    emailInput: 'input[name="email"], input[id="j_username"]',
    emailSubmit: 'button[type="submit"], button[id="continue"], #logOnFormSubmit',
    passwordInput: 'input[type="password"], input[id="j_password"]',
    passwordSubmit: 'button[type="submit"], #logOnFormSubmit',
    goToTrial: 'a:has-text("转到您的试用账户"), button:has-text("转到您的试用账户"), a:has-text("Go To Your Trial Account"), button:has-text("Go To Your Trial Account")'
    // goToTrial: 'a:has-text(/转到您的试用账户|Go To Your Trial Account/i), button:has-text(/转到您的试用账户|Go To Your Trial Account/i)'
    // goToTrial: 'a:has-text("转到您的试用账户"), button:has-text("转到您的试用账户")'
  };

  let browser;
  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      console.warn("⚠️ Playwright 浏览器未安装，正在自动安装 Chromium...");
      execSync("npx playwright install --with-deps chromium", { stdio: "inherit" });
      browser = await chromium.launch({ headless: true });
    }

    const page = await browser.newPage();

    console.log("🌐 打开 N8N 登录页面...");
    await page.goto("https://lycc17-n8n-free.hf.space/");
    await page.waitForTimeout(10000);

    // Step 1: 输入邮箱
    console.log("✉️ 输入邮箱...");
    await page.fill(SELECTORS.emailInput, process.env.EMAIL);
    // Step 2: 输入密码
    await page.waitForSelector(SELECTORS.passwordInput, { timeout: 15000 });
    console.log("🔑 输入密码...");
    await page.fill(SELECTORS.passwordInput, process.PASSWORD);
    await page.click(SELECTORS.passwordSubmit);

    // 等待登录完成
    await page.waitForTimeout(8000);

    // Step 3: 截图登录后的页面
    const loginScreenshot = "login-success.png";
    await page.screenshot({ path: loginScreenshot, fullPage: true });
    await sendToTelegram(loginScreenshot, "✅ N8N 登录成功页面");


    await page.waitForTimeout(8000);

    // Step 5: 截图试用账户页面
    const trialScreenshot = "trial-account.png";
    await page.screenshot({ path: trialScreenshot, fullPage: true });
    await sendToTelegram(trialScreenshot, "✅ 已进入 N8n workflows面");

    console.log("🎉 两张截图已发送到 Telegram");

  } catch (err) {
    console.error("❌ 登录或进入试用账户失败:", err);
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        const errorPath = "error.png";
        await page.screenshot({ path: errorPath, fullPage: true });
        await sendToTelegram(errorPath, "❌ SAP BTP 操作失败截图");
        console.log("🚨 失败截图已发送到 Telegram");
      } catch {}
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
