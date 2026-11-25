-- Einheitliche Kontoart „Mitglied“ (eigene Migration, da ein neuer Enum-Wert erst nach dem Commit nutzbar ist)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEMBER';
