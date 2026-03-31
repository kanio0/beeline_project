import asyncio
import os
import threading
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.event import Event
from app.models.user import User

_started = False

async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Привет! Я бот платформы кибер-волонтёров. Команды: /me /leaderboard /events")

async def me_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    username = update.effective_user.username
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_username == username).first()
        if not user:
            await update.message.reply_text("Профиль не найден. Попросите координатора привязать Telegram username.")
            return
        await update.message.reply_text(f"{user.name}\nРоль: {user.role}\nКоины: {user.coins_balance}\nСтатус: {user.status}")
    finally:
        db.close()

async def leaderboard_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.coins_balance.desc()).limit(5).all()
        text = "🏆 Топ участников:\n" + "\n".join(f"{i+1}. {u.name} — {u.coins_balance}" for i, u in enumerate(users))
        await update.message.reply_text(text)
    finally:
        db.close()

async def events_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        events = db.query(Event).order_by(Event.starts_at.asc()).limit(5).all()
        text = "📅 Ближайшие события:\n" + "\n".join(f"• {e.title} — {e.starts_at.strftime('%d.%m %H:%M')}" for e in events)
        await update.message.reply_text(text)
    finally:
        db.close()


def _run_bot():
    async def runner():
        app = ApplicationBuilder().token(settings.bot_token).build()
        app.add_handler(CommandHandler("start", start_cmd))
        app.add_handler(CommandHandler("me", me_cmd))
        app.add_handler(CommandHandler("leaderboard", leaderboard_cmd))
        app.add_handler(CommandHandler("events", events_cmd))
        await app.initialize()
        await app.start()
        await app.updater.start_polling()
        while True:
            await asyncio.sleep(3600)
    asyncio.run(runner())


def maybe_start_bot():
    global _started
    if _started or not settings.run_bot or not settings.bot_token:
        return
    _started = True
    thread = threading.Thread(target=_run_bot, daemon=True)
    thread.start()
