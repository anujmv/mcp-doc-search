# Sample: Customer Onboarding Runbook

This is a sample document used to demonstrate grounded retrieval.

## KYC verification
New customers must complete identity verification before their first transaction.
The flow integrates DigiLocker and a KYC validation API. Failed verifications are
retried up to three times before manual review.

## Account tiers
- Basic: up to 3 lakh credit line, no collateral.
- Secured: 3 lakh to 75 lakh, requires collateral documents.

## SLA
Standard onboarding completes within 24 hours. Escalations route to the field team.
