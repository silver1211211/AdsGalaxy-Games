-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'REWARD', 'WITHDRAWAL', 'ADJUSTMENT', 'TASK_REWARD', 'GAME_REWARD', 'POINT_CONVERSION', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_COMPLETED', 'WITHDRAWAL_REVERSAL', 'WITHDRAWAL_FEE', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'ABANDONED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskCompletionStatus" AS ENUM ('STARTED', 'PENDING_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TELEGRAM_CHANNEL_JOIN', 'TELEGRAM_GROUP_JOIN', 'TELEGRAM_BOT_START', 'TELEGRAM_POST_VIEW', 'MINI_APP_OPEN', 'WEBSITE_VISIT', 'SOCIAL_ACTION', 'ADS_GALAXY_AD', 'GAME_COMPLETION', 'DAILY_CHECK_IN', 'QUIZ_OR_SURVEY', 'CUSTOM_PROOF', 'PARTNER_CALLBACK');

-- CreateEnum
CREATE TYPE "TaskVerificationMethod" AS ENUM ('INTERNAL_EVENT', 'TELEGRAM_MEMBERSHIP', 'TELEGRAM_BOT_CALLBACK', 'PARTNER_CALLBACK', 'ADS_GALAXY_VERIFICATION', 'COMPLETION_CODE', 'CONFIRMATION_QUESTION', 'MANUAL_PROOF', 'REINFORCED_SELF_CONFIRMATION', 'NONE');

-- CreateEnum
CREATE TYPE "TaskVerificationStrength" AS ENUM ('VERIFIED', 'REINFORCED_SELF_CONFIRMATION', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "TaskRewardType" AS ENUM ('POINTS', 'WALLET', 'POINTS_AND_WALLET', 'NON_FINANCIAL');

-- CreateEnum
CREATE TYPE "TaskRepeatPolicy" AS ENUM ('ONCE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "TaskAttemptStatus" AS ENUM ('STARTED', 'DESTINATION_OPENED', 'READY_TO_CONFIRM', 'PENDING_VERIFICATION', 'PENDING_REVIEW', 'VERIFIED', 'SELF_CONFIRMED', 'APPROVED', 'REJECTED', 'REWARDED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "TaskQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'EXACT_CODE', 'ACKNOWLEDGEMENT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConversionRoundingRule" AS ENUM ('DOWN');

-- CreateEnum
CREATE TYPE "WalletRiskStatus" AS ENUM ('CLEAR', 'REVIEW', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'REWARD', 'GAME', 'TASK', 'WALLET', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MiniAppStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('MONEY', 'COIN', 'WALLET', 'GAME_BENEFIT', 'POINT_MULTIPLIER');

-- CreateEnum
CREATE TYPE "RewardClaimStatus" AS ENUM ('MATCHED', 'AD_REQUESTED', 'BROWSER_COMPLETED', 'PENDING_VERIFICATION', 'VERIFIED', 'CREDITED', 'CLOSED_EARLY', 'NO_FILL', 'FAILED', 'EXPIRED', 'ALREADY_CLAIMED');

-- CreateEnum
CREATE TYPE "RepeatPolicy" AS ENUM ('ONCE_EVER', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "AdEnvironment" AS ENUM ('PRODUCTION_VERIFIED', 'SANDBOX', 'DEVELOPMENT_MOCK');

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('QUICK', 'CLASSIC', 'CATEGORY', 'DAILY');

-- CreateEnum
CREATE TYPE "QuizDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuizQuestionSource" AS ENUM ('GLOBAL_DEFAULT', 'MINI_APP_CUSTOM');

-- CreateEnum
CREATE TYPE "QuizQuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuizReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuizSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'AD_BREAK', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TapCollectorMode" AS ENUM ('QUICK', 'CLASSIC', 'SURVIVAL', 'DAILY');

-- CreateEnum
CREATE TYPE "TapCollectorSessionStatus" AS ENUM ('ACTIVE', 'WAVE_COMPLETE', 'AD_BREAK', 'PAUSED', 'GAME_OVER', 'COMPLETED', 'ABANDONED', 'EXPIRED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "TapItemType" AS ENUM ('COIN', 'GEM', 'STAR', 'CLOCK', 'SHIELD', 'MAGNET', 'FREEZE', 'BOMB', 'TRAP', 'SPONSORED_CRATE');

-- CreateEnum
CREATE TYPE "TapMovementType" AS ENUM ('STATIC', 'DRIFT_LEFT', 'DRIFT_RIGHT', 'DRIFT_UP', 'DRIFT_DOWN', 'BOUNCE', 'ZIGZAG', 'CIRCLE');

-- CreateEnum
CREATE TYPE "TapSpawnStatus" AS ENUM ('SCHEDULED', 'COLLECTED', 'MISSED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "language" VARCHAR(10),
    "avatar" TEXT,
    "country" VARCHAR(2),
    "referral_code" TEXT NOT NULL,
    "referred_by" TEXT,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "total_rewards" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total_games" INTEGER NOT NULL DEFAULT 0,
    "wallet_balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "withdrawal_hold_balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "lifetime_earnings" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "balance_before" DECIMAL(18,6),
    "balance_after" DECIMAL(18,6),
    "reference_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" TEXT,
    "estimated_seconds" INTEGER,
    "reward_min" INTEGER NOT NULL DEFAULT 0,
    "reward_max" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'STARTED',
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "reward_earned" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "MiniAppStatus" NOT NULL DEFAULT 'ACTIVE',
    "telegram_bot_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mini_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_app_memberships" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'USER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mini_app_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_match_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "special_cards_enabled" BOOLEAN NOT NULL DEFAULT true,
    "money_match_enabled" BOOLEAN NOT NULL DEFAULT true,
    "coin_match_enabled" BOOLEAN NOT NULL DEFAULT true,
    "rewarded_ads_enabled" BOOLEAN NOT NULL DEFAULT true,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "money_reward_amount" DECIMAL(18,6) NOT NULL DEFAULT 0.05,
    "money_reward_min" DECIMAL(18,6) NOT NULL DEFAULT 0.01,
    "money_reward_max" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "coin_multiplier_min" INTEGER NOT NULL DEFAULT 1200,
    "coin_multiplier_max" INTEGER NOT NULL DEFAULT 1500,
    "coin_probability_early" INTEGER NOT NULL DEFAULT 35,
    "option_a_weight" INTEGER NOT NULL DEFAULT 50,
    "option_b_weight" INTEGER NOT NULL DEFAULT 20,
    "option_c_weight" INTEGER NOT NULL DEFAULT 30,
    "money_repeat_policy" "RepeatPolicy" NOT NULL DEFAULT 'ONCE_EVER',
    "coin_repeat_policy" "RepeatPolicy" NOT NULL DEFAULT 'DAILY',
    "max_money_claims_user_day" INTEGER NOT NULL DEFAULT 5,
    "max_coin_claims_user_day" INTEGER NOT NULL DEFAULT 5,
    "max_wallet_user_day" DECIMAL(18,6) NOT NULL DEFAULT 0.25,
    "max_wallet_mini_app_day" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "retry_cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "max_ad_retries" INTEGER NOT NULL DEFAULT 3,
    "pending_expiry_minutes" INTEGER NOT NULL DEFAULT 1440,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_match_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads_galaxy_configurations" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mini_app_public_id" TEXT,
    "environment" "AdEnvironment" NOT NULL DEFAULT 'PRODUCTION_VERIFIED',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "last_successful_ad_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_galaxy_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_match_attempts" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'ACTIVE',
    "seed" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "reward_assignment" JSONB NOT NULL,
    "board" JSONB NOT NULL,
    "matched_pair_slots" JSONB NOT NULL,
    "first_selected_index" INTEGER,
    "moves" INTEGER NOT NULL DEFAULT 0,
    "mismatches" INTEGER NOT NULL DEFAULT 0,
    "current_combo" INTEGER NOT NULL DEFAULT 0,
    "highest_combo" INTEGER NOT NULL DEFAULT 0,
    "shuffle_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused_at" TIMESTAMP(3),
    "paused_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "base_points" INTEGER NOT NULL DEFAULT 0,
    "final_points" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER,
    "wallet_reward_total" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_match_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_reward_claims" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "game_key" TEXT NOT NULL DEFAULT 'memory-match',
    "quiz_session_id" TEXT,
    "tap_collector_session_id" TEXT,
    "tap_spawn_event_id" TEXT,
    "wave" INTEGER,
    "question_position" INTEGER,
    "claim_context" TEXT,
    "level" INTEGER NOT NULL,
    "pair_slot" INTEGER NOT NULL,
    "reward_type" "RewardType" NOT NULL,
    "status" "RewardClaimStatus" NOT NULL DEFAULT 'MATCHED',
    "configured_money_amount" DECIMAL(18,6),
    "configured_multiplier_min" INTEGER,
    "configured_multiplier_max" INTEGER,
    "issued_multiplier" INTEGER,
    "internal_ad_request_id" TEXT,
    "provider_event_id" TEXT,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ad_requested_at" TIMESTAMP(3),
    "browser_completed_at" TIMESTAMP(3),
    "provider_verified_at" TIMESTAMP(3),
    "credited_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "wallet_transaction_id" TEXT,

    CONSTRAINT "game_reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_entitlements" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_key" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "reward_type" "RewardType" NOT NULL,
    "period_key" TEXT NOT NULL,
    "claimId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "quiz_session_id" TEXT,
    "tap_collector_session_id" TEXT,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_categories" (
    "id" TEXT NOT NULL,
    "owner_mini_app_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_app_quiz_categories" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mini_app_quiz_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "owner_mini_app_id" TEXT,
    "created_by_user_id" TEXT,
    "source_type" "QuizQuestionSource" NOT NULL,
    "category_id" TEXT NOT NULL,
    "difficulty" "QuizDifficulty" NOT NULL,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "status" "QuizQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "review_status" "QuizReviewStatus" NOT NULL DEFAULT 'PENDING',
    "seed_key" TEXT,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "times_answered" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "average_response_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quick_enabled" BOOLEAN NOT NULL DEFAULT true,
    "classic_enabled" BOOLEAN NOT NULL DEFAULT true,
    "category_enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sound_default" BOOLEAN NOT NULL DEFAULT true,
    "explanations_enabled" BOOLEAN NOT NULL DEFAULT true,
    "immediate_feedback" BOOLEAN NOT NULL DEFAULT true,
    "result_review_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quick_question_count" INTEGER NOT NULL DEFAULT 5,
    "classic_question_count" INTEGER NOT NULL DEFAULT 10,
    "category_question_count" INTEGER NOT NULL DEFAULT 10,
    "daily_question_count" INTEGER NOT NULL DEFAULT 10,
    "avoid_recent_questions" BOOLEAN NOT NULL DEFAULT true,
    "recent_window" INTEGER NOT NULL DEFAULT 30,
    "minimum_active_questions" INTEGER NOT NULL DEFAULT 10,
    "allow_custom_questions" BOOLEAN NOT NULL DEFAULT true,
    "use_global_questions" BOOLEAN NOT NULL DEFAULT true,
    "custom_weight" INTEGER NOT NULL DEFAULT 40,
    "global_weight" INTEGER NOT NULL DEFAULT 60,
    "easy_time_seconds" INTEGER NOT NULL DEFAULT 15,
    "medium_time_seconds" INTEGER NOT NULL DEFAULT 18,
    "hard_time_seconds" INTEGER NOT NULL DEFAULT 22,
    "feedback_duration_ms" INTEGER NOT NULL DEFAULT 1500,
    "explanation_duration_ms" INTEGER NOT NULL DEFAULT 2500,
    "pause_on_background" BOOLEAN NOT NULL DEFAULT true,
    "easy_base_points" INTEGER NOT NULL DEFAULT 10,
    "medium_base_points" INTEGER NOT NULL DEFAULT 20,
    "hard_base_points" INTEGER NOT NULL DEFAULT 30,
    "max_time_bonus_bps" INTEGER NOT NULL DEFAULT 5000,
    "streak_step_bps" INTEGER NOT NULL DEFAULT 1000,
    "max_streak_bonus_bps" INTEGER NOT NULL DEFAULT 5000,
    "daily_completion_bonus" INTEGER NOT NULL DEFAULT 50,
    "perfect_score_bonus" INTEGER NOT NULL DEFAULT 50,
    "minimum_completion_points" INTEGER NOT NULL DEFAULT 5,
    "scheduled_wallet_enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduled_wallet_amount" DECIMAL(18,6) NOT NULL DEFAULT 0.01,
    "daily_wallet_user_cap" DECIMAL(18,6) NOT NULL DEFAULT 0.05,
    "daily_wallet_mini_app_cap" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "max_payable_ads_session" INTEGER NOT NULL DEFAULT 2,
    "scheduled_repeat_policy" "RepeatPolicy" NOT NULL DEFAULT 'DAILY',
    "fifty_fifty_enabled" BOOLEAN NOT NULL DEFAULT true,
    "extra_time_enabled" BOOLEAN NOT NULL DEFAULT true,
    "second_chance_enabled" BOOLEAN NOT NULL DEFAULT true,
    "double_points_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_fifty_fifty" INTEGER NOT NULL DEFAULT 1,
    "max_extra_time" INTEGER NOT NULL DEFAULT 1,
    "max_second_chance" INTEGER NOT NULL DEFAULT 1,
    "max_double_points" INTEGER NOT NULL DEFAULT 1,
    "quick_ad_position" INTEGER NOT NULL DEFAULT 3,
    "classic_ad_position_1" INTEGER NOT NULL DEFAULT 5,
    "classic_ad_position_2" INTEGER DEFAULT 8,
    "category_ad_position" INTEGER NOT NULL DEFAULT 5,
    "daily_ad_position" INTEGER NOT NULL DEFAULT 5,
    "min_session_before_ad_seconds" INTEGER NOT NULL DEFAULT 45,
    "min_ad_interval_seconds" INTEGER NOT NULL DEFAULT 90,
    "utility_delay_seconds" INTEGER NOT NULL DEFAULT 60,
    "max_scheduled_ads_session" INTEGER NOT NULL DEFAULT 2,
    "sponsored_lobby_enabled" BOOLEAN NOT NULL DEFAULT true,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "retry_cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "max_retry_attempts" INTEGER NOT NULL DEFAULT 3,
    "pending_expiry_minutes" INTEGER NOT NULL DEFAULT 1440,
    "max_daily_claims" INTEGER NOT NULL DEFAULT 5,
    "pending_liability_cap" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" "QuizMode" NOT NULL,
    "category_id" TEXT,
    "status" "QuizSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "period_key" TEXT,
    "seed" TEXT NOT NULL,
    "config_snapshot" JSONB NOT NULL,
    "current_position" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "timeout_count" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "scheduled_ads_due" INTEGER NOT NULL DEFAULT 0,
    "scheduled_ads_completed" INTEGER NOT NULL DEFAULT 0,
    "no_fill_count" INTEGER NOT NULL DEFAULT 0,
    "fifty_fifty_used" INTEGER NOT NULL DEFAULT 0,
    "extra_time_used" INTEGER NOT NULL DEFAULT 0,
    "second_chance_used" INTEGER NOT NULL DEFAULT 0,
    "double_points_used" INTEGER NOT NULL DEFAULT 0,
    "question_started_at" TIMESTAMP(3),
    "question_allowed_seconds" INTEGER,
    "paused_at" TIMESTAMP(3),
    "total_paused_ms" INTEGER NOT NULL DEFAULT 0,
    "last_ad_completed_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "final_points" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER,
    "wallet_reward_total" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_session_questions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT,
    "position" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "difficulty" "QuizDifficulty" NOT NULL,
    "options_snapshot" JSONB NOT NULL,
    "correct_option_key" TEXT NOT NULL,
    "selected_option_key" TEXT,
    "removed_option_keys" JSONB,
    "answered_at" TIMESTAMP(3),
    "response_ms" INTEGER,
    "is_correct" BOOLEAN,
    "timed_out" BOOLEAN NOT NULL DEFAULT false,
    "second_chance" BOOLEAN NOT NULL DEFAULT false,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "allowed_seconds" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quiz_session_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_daily_challenges" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "question_set_key" TEXT NOT NULL,
    "first_completed_at" TIMESTAMP(3),
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "best_accuracy_bps" INTEGER NOT NULL DEFAULT 0,
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tap_collector_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quick_enabled" BOOLEAN NOT NULL DEFAULT true,
    "classic_enabled" BOOLEAN NOT NULL DEFAULT true,
    "survival_enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quick_waves" INTEGER NOT NULL DEFAULT 3,
    "classic_waves" INTEGER NOT NULL DEFAULT 5,
    "daily_waves" INTEGER NOT NULL DEFAULT 4,
    "quick_wave_seconds" INTEGER NOT NULL DEFAULT 20,
    "classic_wave_seconds" INTEGER NOT NULL DEFAULT 25,
    "survival_wave_seconds" INTEGER NOT NULL DEFAULT 30,
    "daily_wave_seconds" INTEGER NOT NULL DEFAULT 25,
    "survival_max_seconds" INTEGER NOT NULL DEFAULT 480,
    "initial_health" INTEGER NOT NULL DEFAULT 3,
    "max_visible_mobile" INTEGER NOT NULL DEFAULT 8,
    "max_visible_desktop" INTEGER NOT NULL DEFAULT 10,
    "base_spawn_interval_ms" INTEGER NOT NULL DEFAULT 1100,
    "minimum_spawn_interval_ms" INTEGER NOT NULL DEFAULT 500,
    "coin_points" INTEGER NOT NULL DEFAULT 10,
    "gem_points" INTEGER NOT NULL DEFAULT 25,
    "star_points" INTEGER NOT NULL DEFAULT 40,
    "miss_penalty" INTEGER NOT NULL DEFAULT 0,
    "harmful_penalty" INTEGER NOT NULL DEFAULT 25,
    "wave_bonus" INTEGER NOT NULL DEFAULT 50,
    "perfect_wave_bonus" INTEGER NOT NULL DEFAULT 75,
    "health_bonus" INTEGER NOT NULL DEFAULT 30,
    "clock_seconds" INTEGER NOT NULL DEFAULT 5,
    "max_shield_count" INTEGER NOT NULL DEFAULT 1,
    "magnet_duration_ms" INTEGER NOT NULL DEFAULT 5000,
    "freeze_duration_ms" INTEGER NOT NULL DEFAULT 5000,
    "scheduled_wallet_enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduled_wallet_amount" DECIMAL(18,6) NOT NULL DEFAULT 0.01,
    "crate_wallet_enabled" BOOLEAN NOT NULL DEFAULT true,
    "crate_wallet_amount" DECIMAL(18,6) NOT NULL DEFAULT 0.01,
    "max_scheduled_ads_session" INTEGER NOT NULL DEFAULT 2,
    "max_total_ads_session" INTEGER NOT NULL DEFAULT 5,
    "min_ad_interval_seconds" INTEGER NOT NULL DEFAULT 90,
    "continue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "shield_ad_enabled" BOOLEAN NOT NULL DEFAULT true,
    "magnet_ad_enabled" BOOLEAN NOT NULL DEFAULT true,
    "freeze_ad_enabled" BOOLEAN NOT NULL DEFAULT true,
    "double_points_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sponsored_lobby_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pause_on_background" BOOLEAN NOT NULL DEFAULT true,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tap_collector_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tap_collector_sessions" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" "TapCollectorMode" NOT NULL,
    "status" "TapCollectorSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "period_key" TEXT,
    "seed" TEXT NOT NULL,
    "config_snapshot" JSONB NOT NULL,
    "current_wave" INTEGER NOT NULL DEFAULT 1,
    "total_waves" INTEGER NOT NULL,
    "wave_started_at" TIMESTAMP(3) NOT NULL,
    "wave_ends_at" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "base_points" INTEGER NOT NULL DEFAULT 0,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "final_points" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 3,
    "shield_count" INTEGER NOT NULL DEFAULT 0,
    "combo" INTEGER NOT NULL DEFAULT 0,
    "best_combo" INTEGER NOT NULL DEFAULT 0,
    "collected_count" INTEGER NOT NULL DEFAULT 0,
    "missed_count" INTEGER NOT NULL DEFAULT 0,
    "harmful_tap_count" INTEGER NOT NULL DEFAULT 0,
    "total_spawned" INTEGER NOT NULL DEFAULT 0,
    "scheduled_ads_due" INTEGER NOT NULL DEFAULT 0,
    "scheduled_ads_completed" INTEGER NOT NULL DEFAULT 0,
    "utility_ads_used" INTEGER NOT NULL DEFAULT 0,
    "sponsored_crates_spawned" INTEGER NOT NULL DEFAULT 0,
    "sponsored_crates_claimed" INTEGER NOT NULL DEFAULT 0,
    "wallet_reward_total" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "paused_at" TIMESTAMP(3),
    "paused_ms" INTEGER NOT NULL DEFAULT 0,
    "last_event_sequence" INTEGER NOT NULL DEFAULT 0,
    "last_interaction_at" TIMESTAMP(3),
    "last_ad_completed_at" TIMESTAMP(3),
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_signals" JSONB,
    "stars" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tap_collector_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tap_collector_spawn_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "wave" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "item_type" "TapItemType" NOT NULL,
    "movement_type" "TapMovementType" NOT NULL,
    "normalized_x" INTEGER NOT NULL,
    "normalized_y" INTEGER NOT NULL,
    "speed_tier" INTEGER NOT NULL,
    "base_value" INTEGER NOT NULL,
    "spawned_at_offset_ms" INTEGER NOT NULL,
    "expires_at_offset_ms" INTEGER NOT NULL,
    "status" "TapSpawnStatus" NOT NULL DEFAULT 'SCHEDULED',
    "collected_at" TIMESTAMP(3),
    "missed_at" TIMESTAMP(3),
    "processed_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tap_collector_spawn_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tap_collector_daily_hunts" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "first_completed_at" TIMESTAMP(3),
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tap_collector_daily_hunts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_daily_usage" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT,
    "usage_date" DATE NOT NULL,
    "money_claim_count" INTEGER NOT NULL DEFAULT 0,
    "coin_claim_count" INTEGER NOT NULL DEFAULT 0,
    "wallet_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_daily_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "session_id" TEXT,
    "score" INTEGER NOT NULL,
    "rank" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_match_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "total_matches" INTEGER NOT NULL DEFAULT 0,
    "total_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_moves" INTEGER NOT NULL DEFAULT 0,
    "highest_score" INTEGER NOT NULL DEFAULT 0,
    "fastest_win_seconds" INTEGER,
    "best_combo" INTEGER NOT NULL DEFAULT 0,
    "highest_unlocked_level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "game_slug" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "type" "TaskType" NOT NULL DEFAULT 'WEBSITE_VISIT',
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "destination_url" TEXT,
    "verification_method" "TaskVerificationMethod" NOT NULL DEFAULT 'REINFORCED_SELF_CONFIRMATION',
    "verification_strength" "TaskVerificationStrength" NOT NULL DEFAULT 'REINFORCED_SELF_CONFIRMATION',
    "minimum_engagement_seconds" INTEGER NOT NULL DEFAULT 20,
    "completion_window_minutes" INTEGER NOT NULL DEFAULT 1440,
    "max_confirmation_attempts" INTEGER NOT NULL DEFAULT 3,
    "proof_required" BOOLEAN NOT NULL DEFAULT false,
    "reward_type" "TaskRewardType" NOT NULL DEFAULT 'POINTS',
    "reward_points" INTEGER NOT NULL DEFAULT 0,
    "reward_wallet" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "repeat_policy" "TaskRepeatPolicy" NOT NULL DEFAULT 'ONCE',
    "maximum_completions" INTEGER,
    "completions_count" INTEGER NOT NULL DEFAULT 0,
    "total_budget" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "reserved_budget" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "spent_budget" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "estimated_seconds" INTEGER NOT NULL DEFAULT 30,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" "TaskCompletionStatus" NOT NULL DEFAULT 'STARTED',
    "reward_earned" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "proof" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "points_rewards_enabled" BOOLEAN NOT NULL DEFAULT true,
    "wallet_rewards_enabled" BOOLEAN NOT NULL DEFAULT false,
    "self_confirmation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "manual_proof_enabled" BOOLEAN NOT NULL DEFAULT true,
    "maximum_active_tasks" INTEGER NOT NULL DEFAULT 50,
    "maximum_wallet_reward_task" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "maximum_points_reward_task" INTEGER NOT NULL DEFAULT 10000,
    "user_daily_wallet_cap" DECIMAL(18,6) NOT NULL DEFAULT 5,
    "user_daily_points_cap" INTEGER NOT NULL DEFAULT 50000,
    "mini_app_daily_budget" DECIMAL(18,6) NOT NULL DEFAULT 500,
    "default_engagement_seconds" INTEGER NOT NULL DEFAULT 20,
    "proof_retention_days" INTEGER NOT NULL DEFAULT 30,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_confirmation_questions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "type" "TaskQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answer_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "case_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_confirmation_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attempts" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "status" "TaskAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "task_version" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "reward_type" "TaskRewardType" NOT NULL,
    "reward_points" INTEGER NOT NULL,
    "reward_wallet" DECIMAL(18,6) NOT NULL,
    "minimum_engagement_seconds" INTEGER NOT NULL,
    "destination_opened_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "rewarded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmation_failures" INTEGER NOT NULL DEFAULT 0,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_signals" JSONB,
    "point_transaction_id" TEXT,
    "wallet_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attempt_events" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attempt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "status" "TaskAttemptStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verification_label" TEXT NOT NULL,
    "answer_text" TEXT,
    "user_visible_reason" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_proofs" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_settings" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "wallet_enabled" BOOLEAN NOT NULL DEFAULT true,
    "withdrawals_enabled" BOOLEAN NOT NULL DEFAULT false,
    "conversion_enabled" BOOLEAN NOT NULL DEFAULT false,
    "conversion_emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "points_per_dollar" INTEGER NOT NULL DEFAULT 1000,
    "minimum_conversion_points" INTEGER NOT NULL DEFAULT 1000,
    "maximum_conversion_points_request" INTEGER NOT NULL DEFAULT 100000,
    "maximum_conversion_points_day" INTEGER NOT NULL DEFAULT 100000,
    "maximum_conversion_credit_day" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "conversion_fee_bps" INTEGER NOT NULL DEFAULT 0,
    "conversion_rounding" "ConversionRoundingRule" NOT NULL DEFAULT 'DOWN',
    "minimum_withdrawal" DECIMAL(18,6) NOT NULL DEFAULT 10,
    "maximum_withdrawal" DECIMAL(18,6) NOT NULL DEFAULT 1000,
    "maximum_withdrawal_day" DECIMAL(18,6) NOT NULL DEFAULT 2000,
    "maximum_mini_app_payout_day" DECIMAL(18,6) NOT NULL DEFAULT 10000,
    "maximum_outstanding_liability" DECIMAL(18,6) NOT NULL DEFAULT 50000,
    "cancellation_minutes" INTEGER NOT NULL DEFAULT 30,
    "emergency_disabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "last_reconciled_at" TIMESTAMP(3),
    "reconciliation_status" TEXT NOT NULL DEFAULT 'NOT_RUN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_payout_methods" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "destination_label" TEXT NOT NULL,
    "validation_pattern" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "minimum_amount" DECIMAL(18,6) NOT NULL DEFAULT 10,
    "maximum_amount" DECIMAL(18,6) NOT NULL DEFAULT 1000,
    "fixed_fee" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "fee_basis_points" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_conversions" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "points_per_dollar" INTEGER NOT NULL,
    "fee_basis_points" INTEGER NOT NULL,
    "gross_amount" DECIMAL(18,6) NOT NULL,
    "fee_amount" DECIMAL(18,6) NOT NULL,
    "net_amount" DECIMAL(18,6) NOT NULL,
    "point_transaction_id" TEXT NOT NULL,
    "wallet_transaction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "payout_method_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "fee" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,6) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "destination_encrypted" TEXT NOT NULL,
    "destination_masked" TEXT NOT NULL,
    "external_id" TEXT,
    "risk_status" "WalletRiskStatus" NOT NULL DEFAULT 'CLEAR',
    "review_note" TEXT,
    "hold_transaction_id" TEXT NOT NULL,
    "completion_transaction_id" TEXT,
    "reversal_transaction_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_adjustments" (
    "id" TEXT NOT NULL,
    "mini_app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "wallet_amount" DECIMAL(18,6),
    "points_amount" INTEGER,
    "reason" TEXT NOT NULL,
    "wallet_transaction_id" TEXT,
    "point_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" JSONB,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_mini_app_id_user_id_key" ON "wallets"("mini_app_id", "user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_type_idx" ON "wallet_transactions"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_mini_app_id_reference_id_key" ON "wallet_transactions"("mini_app_id", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_status_sort_order_idx" ON "games"("status", "sort_order");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_started_at_idx" ON "game_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "game_sessions_game_id_status_idx" ON "game_sessions"("game_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mini_apps_slug_key" ON "mini_apps"("slug");

-- CreateIndex
CREATE INDEX "mini_app_memberships_user_id_status_idx" ON "mini_app_memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mini_app_memberships_mini_app_id_user_id_key" ON "mini_app_memberships"("mini_app_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memory_match_settings_mini_app_id_key" ON "memory_match_settings"("mini_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "ads_galaxy_configurations_mini_app_id_key" ON "ads_galaxy_configurations"("mini_app_id");

-- CreateIndex
CREATE INDEX "memory_match_attempts_mini_app_id_user_id_level_status_idx" ON "memory_match_attempts"("mini_app_id", "user_id", "level", "status");

-- CreateIndex
CREATE INDEX "memory_match_attempts_expires_at_status_idx" ON "memory_match_attempts"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_internal_ad_request_id_key" ON "game_reward_claims"("internal_ad_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_provider_event_id_key" ON "game_reward_claims"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_wallet_transaction_id_key" ON "game_reward_claims"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "game_reward_claims_mini_app_id_user_id_status_idx" ON "game_reward_claims"("mini_app_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "game_reward_claims_expires_at_status_idx" ON "game_reward_claims"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_attempt_id_pair_slot_reward_type_key" ON "game_reward_claims"("attempt_id", "pair_slot", "reward_type");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_quiz_session_id_question_position_claim__key" ON "game_reward_claims"("quiz_session_id", "question_position", "claim_context");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_tap_collector_session_id_wave_claim_cont_key" ON "game_reward_claims"("tap_collector_session_id", "wave", "claim_context");

-- CreateIndex
CREATE UNIQUE INDEX "game_reward_claims_tap_spawn_event_id_claim_context_key" ON "game_reward_claims"("tap_spawn_event_id", "claim_context");

-- CreateIndex
CREATE INDEX "reward_entitlements_claimId_idx" ON "reward_entitlements"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_entitlements_mini_app_id_user_id_game_key_level_rewa_key" ON "reward_entitlements"("mini_app_id", "user_id", "game_key", "level", "reward_type", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_attempt_id_key" ON "point_transactions"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_quiz_session_id_key" ON "point_transactions"("quiz_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_tap_collector_session_id_key" ON "point_transactions"("tap_collector_session_id");

-- CreateIndex
CREATE INDEX "point_transactions_mini_app_id_user_id_created_at_idx" ON "point_transactions"("mini_app_id", "user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_mini_app_id_reference_id_key" ON "point_transactions"("mini_app_id", "reference_id");

-- CreateIndex
CREATE INDEX "quiz_categories_enabled_sort_order_idx" ON "quiz_categories"("enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_categories_owner_mini_app_id_slug_key" ON "quiz_categories"("owner_mini_app_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "mini_app_quiz_categories_mini_app_id_category_id_key" ON "mini_app_quiz_categories"("mini_app_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_seed_key_key" ON "quiz_questions"("seed_key");

-- CreateIndex
CREATE INDEX "quiz_questions_owner_mini_app_id_status_difficulty_idx" ON "quiz_questions"("owner_mini_app_id", "status", "difficulty");

-- CreateIndex
CREATE INDEX "quiz_questions_category_id_status_is_active_idx" ON "quiz_questions"("category_id", "status", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_options_question_id_sort_order_key" ON "quiz_question_options"("question_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_settings_mini_app_id_key" ON "quiz_settings"("mini_app_id");

-- CreateIndex
CREATE INDEX "quiz_sessions_mini_app_id_user_id_status_idx" ON "quiz_sessions"("mini_app_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "quiz_sessions_mini_app_id_mode_period_key_idx" ON "quiz_sessions"("mini_app_id", "mode", "period_key");

-- CreateIndex
CREATE INDEX "quiz_session_questions_question_id_idx" ON "quiz_session_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_session_questions_session_id_position_key" ON "quiz_session_questions"("session_id", "position");

-- CreateIndex
CREATE INDEX "quiz_daily_challenges_mini_app_id_period_key_best_score_idx" ON "quiz_daily_challenges"("mini_app_id", "period_key", "best_score");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_daily_challenges_mini_app_id_user_id_period_key_key" ON "quiz_daily_challenges"("mini_app_id", "user_id", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "tap_collector_settings_mini_app_id_key" ON "tap_collector_settings"("mini_app_id");

-- CreateIndex
CREATE INDEX "tap_collector_sessions_mini_app_id_user_id_status_idx" ON "tap_collector_sessions"("mini_app_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "tap_collector_sessions_mini_app_id_mode_period_key_idx" ON "tap_collector_sessions"("mini_app_id", "mode", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "tap_collector_spawn_events_processed_key_key" ON "tap_collector_spawn_events"("processed_key");

-- CreateIndex
CREATE INDEX "tap_collector_spawn_events_session_id_wave_status_idx" ON "tap_collector_spawn_events"("session_id", "wave", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tap_collector_spawn_events_session_id_wave_sequence_key" ON "tap_collector_spawn_events"("session_id", "wave", "sequence");

-- CreateIndex
CREATE INDEX "tap_collector_daily_hunts_mini_app_id_period_key_best_score_idx" ON "tap_collector_daily_hunts"("mini_app_id", "period_key", "best_score");

-- CreateIndex
CREATE UNIQUE INDEX "tap_collector_daily_hunts_mini_app_id_user_id_period_key_key" ON "tap_collector_daily_hunts"("mini_app_id", "user_id", "period_key");

-- CreateIndex
CREATE INDEX "reward_daily_usage_mini_app_id_usage_date_idx" ON "reward_daily_usage"("mini_app_id", "usage_date");

-- CreateIndex
CREATE UNIQUE INDEX "reward_daily_usage_mini_app_id_user_id_usage_date_key" ON "reward_daily_usage"("mini_app_id", "user_id", "usage_date");

-- CreateIndex
CREATE INDEX "admin_audit_logs_mini_app_id_created_at_idx" ON "admin_audit_logs"("mini_app_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_user_id_created_at_idx" ON "admin_audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "game_scores_game_id_score_idx" ON "game_scores"("game_id", "score" DESC);

-- CreateIndex
CREATE INDEX "game_scores_user_id_game_id_idx" ON "game_scores"("user_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "memory_match_stats_user_id_key" ON "memory_match_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "achievements"("key");

-- CreateIndex
CREATE INDEX "achievements_game_slug_idx" ON "achievements"("game_slug");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_unlocked_at_idx" ON "user_achievements"("user_id", "unlocked_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "tasks_mini_app_id_status_priority_idx" ON "tasks"("mini_app_id", "status", "priority");

-- CreateIndex
CREATE INDEX "tasks_status_starts_at_ends_at_idx" ON "tasks"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_mini_app_id_slug_key" ON "tasks"("mini_app_id", "slug");

-- CreateIndex
CREATE INDEX "task_completions_status_idx" ON "task_completions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_user_id_task_id_key" ON "task_completions"("user_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_settings_mini_app_id_key" ON "task_settings"("mini_app_id");

-- CreateIndex
CREATE INDEX "task_confirmation_questions_task_id_idx" ON "task_confirmation_questions"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_nonce_key" ON "task_attempts"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_point_transaction_id_key" ON "task_attempts"("point_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_wallet_transaction_id_key" ON "task_attempts"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "task_attempts_mini_app_id_user_id_status_idx" ON "task_attempts"("mini_app_id", "user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_mini_app_id_user_id_task_id_period_key_key" ON "task_attempts"("mini_app_id", "user_id", "task_id", "period_key");

-- CreateIndex
CREATE INDEX "task_attempt_events_attempt_id_created_at_idx" ON "task_attempt_events"("attempt_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempt_events_attempt_id_idempotency_key_key" ON "task_attempt_events"("attempt_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "task_submissions_attempt_id_key" ON "task_submissions"("attempt_id");

-- CreateIndex
CREATE INDEX "task_submissions_mini_app_id_status_created_at_idx" ON "task_submissions"("mini_app_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "task_proofs_submission_id_idx" ON "task_proofs"("submission_id");

-- CreateIndex
CREATE INDEX "task_proofs_sha256_idx" ON "task_proofs"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_settings_mini_app_id_key" ON "wallet_settings"("mini_app_id");

-- CreateIndex
CREATE INDEX "wallet_payout_methods_mini_app_id_enabled_sort_order_idx" ON "wallet_payout_methods"("mini_app_id", "enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_payout_methods_mini_app_id_code_key" ON "wallet_payout_methods"("mini_app_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "point_conversions_point_transaction_id_key" ON "point_conversions"("point_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_conversions_wallet_transaction_id_key" ON "point_conversions"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "point_conversions_mini_app_id_user_id_created_at_idx" ON "point_conversions"("mini_app_id", "user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "point_conversions_mini_app_id_user_id_idempotency_key_key" ON "point_conversions"("mini_app_id", "user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_hold_transaction_id_key" ON "withdrawals"("hold_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_completion_transaction_id_key" ON "withdrawals"("completion_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_reversal_transaction_id_key" ON "withdrawals"("reversal_transaction_id");

-- CreateIndex
CREATE INDEX "withdrawals_mini_app_id_user_id_created_at_idx" ON "withdrawals"("mini_app_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "withdrawals_mini_app_id_status_created_at_idx" ON "withdrawals"("mini_app_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_mini_app_id_user_id_idempotency_key_key" ON "withdrawals"("mini_app_id", "user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_adjustments_wallet_transaction_id_key" ON "wallet_adjustments"("wallet_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_adjustments_point_transaction_id_key" ON "wallet_adjustments"("point_transaction_id");

-- CreateIndex
CREATE INDEX "wallet_adjustments_mini_app_id_user_id_created_at_idx" ON "wallet_adjustments"("mini_app_id", "user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_adjustments_mini_app_id_idempotency_key_key" ON "wallet_adjustments"("mini_app_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "announcements_status_starts_at_ends_at_idx" ON "announcements"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_app_memberships" ADD CONSTRAINT "mini_app_memberships_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_app_memberships" ADD CONSTRAINT "mini_app_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_match_settings" ADD CONSTRAINT "memory_match_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads_galaxy_configurations" ADD CONSTRAINT "ads_galaxy_configurations_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_match_attempts" ADD CONSTRAINT "memory_match_attempts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_match_attempts" ADD CONSTRAINT "memory_match_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "memory_match_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_quiz_session_id_fkey" FOREIGN KEY ("quiz_session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_tap_collector_session_id_fkey" FOREIGN KEY ("tap_collector_session_id") REFERENCES "tap_collector_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_tap_spawn_event_id_fkey" FOREIGN KEY ("tap_spawn_event_id") REFERENCES "tap_collector_spawn_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reward_claims" ADD CONSTRAINT "game_reward_claims_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_entitlements" ADD CONSTRAINT "reward_entitlements_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "memory_match_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_quiz_session_id_fkey" FOREIGN KEY ("quiz_session_id") REFERENCES "quiz_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_tap_collector_session_id_fkey" FOREIGN KEY ("tap_collector_session_id") REFERENCES "tap_collector_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_categories" ADD CONSTRAINT "quiz_categories_owner_mini_app_id_fkey" FOREIGN KEY ("owner_mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_app_quiz_categories" ADD CONSTRAINT "mini_app_quiz_categories_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_app_quiz_categories" ADD CONSTRAINT "mini_app_quiz_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "quiz_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_owner_mini_app_id_fkey" FOREIGN KEY ("owner_mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "quiz_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_options" ADD CONSTRAINT "quiz_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_settings" ADD CONSTRAINT "quiz_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "quiz_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_session_questions" ADD CONSTRAINT "quiz_session_questions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_session_questions" ADD CONSTRAINT "quiz_session_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_daily_challenges" ADD CONSTRAINT "quiz_daily_challenges_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_collector_settings" ADD CONSTRAINT "tap_collector_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_collector_sessions" ADD CONSTRAINT "tap_collector_sessions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_collector_sessions" ADD CONSTRAINT "tap_collector_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_collector_spawn_events" ADD CONSTRAINT "tap_collector_spawn_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tap_collector_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tap_collector_daily_hunts" ADD CONSTRAINT "tap_collector_daily_hunts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_daily_usage" ADD CONSTRAINT "reward_daily_usage_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_match_stats" ADD CONSTRAINT "memory_match_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_settings" ADD CONSTRAINT "task_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_confirmation_questions" ADD CONSTRAINT "task_confirmation_questions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempt_events" ADD CONSTRAINT "task_attempt_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "task_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "task_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_proofs" ADD CONSTRAINT "task_proofs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_settings" ADD CONSTRAINT "wallet_settings_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_payout_methods" ADD CONSTRAINT "wallet_payout_methods_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_conversions" ADD CONSTRAINT "point_conversions_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_conversions" ADD CONSTRAINT "point_conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_conversions" ADD CONSTRAINT "point_conversions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_conversions" ADD CONSTRAINT "point_conversions_point_transaction_id_fkey" FOREIGN KEY ("point_transaction_id") REFERENCES "point_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_conversions" ADD CONSTRAINT "point_conversions_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payout_method_id_fkey" FOREIGN KEY ("payout_method_id") REFERENCES "wallet_payout_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_hold_transaction_id_fkey" FOREIGN KEY ("hold_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_completion_transaction_id_fkey" FOREIGN KEY ("completion_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reversal_transaction_id_fkey" FOREIGN KEY ("reversal_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_mini_app_id_fkey" FOREIGN KEY ("mini_app_id") REFERENCES "mini_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_point_transaction_id_fkey" FOREIGN KEY ("point_transaction_id") REFERENCES "point_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
