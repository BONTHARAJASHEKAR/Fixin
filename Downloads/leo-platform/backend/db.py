"""Database client & shared collection accessors."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Collections
users = db.users
sessions = db.user_sessions
resumes = db.resumes
ats_reports = db.ats_reports
payments = db.payments
subscriptions = db.subscriptions
applications = db.applications
ai_usage = db.ai_usage
admin_logs = db.admin_logs
analytics = db.analytics
notifications = db.notifications
interviews = db.interviews
career_insights = db.career_insights
job_matches = db.job_matches
