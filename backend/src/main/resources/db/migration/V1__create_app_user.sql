
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    CONSTRAINT chk_app_user_approval_status
        CHECK (approval_status IN ('PENDING', 'APPROVED'))
);