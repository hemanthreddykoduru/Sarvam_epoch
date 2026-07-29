# IDEA_SCOPE: Razorpay Triage AI

## 1. Core Decisions

| Decision | Locked answer |
|---|---|
| **One-sentence product** | Razorpay Triage AI is an automated Level 1 support escalation system that dispatches an empathetic voice AI to call frustrated merchants, extracts complex alphanumeric issue data, and automatically logs structured tickets into a support database. |
| **User** | Razorpay Support Managers and Merchants facing critical payment gateway downtime. |
| **Job completed** | Instantly responding to an escalation, calming the merchant down, collecting their Merchant ID and issue description over voice, and syncing the structured data directly into an Excel database for Level 2 support. |
| **Hard input** | A live phone call with a frustrated merchant speaking naturally, providing a complex alphanumeric ID. |
| **Final output/state change** | A structured database row in Microsoft Excel (via Make.com webhook) containing the merchant's exact Name, ID, and Issue Description. |
| **Primary Capability** | **Voice Experience** (handling frustration, active listening, and accurate alphanumeric data extraction via Sarvam AI). |
| **Exact sponsor APIs** | Sarvam Outbound Voice API for low-latency live calling and data extraction. Make.com Webhooks for automation. |
| **Team advantage** | Solo builder capable of rapid full-stack execution (React Dashboard + Backend API + Make.com automation + Sarvam Prompt Engineering). |
| **Creativity thesis** | We are shifting from "Wait in queue for 20 minutes" to "Proactive AI Escalation." The system actively reaches out to the merchant, providing immediate relief and confidence that their issue is being handled. |
| **Delight thesis** | The merchant feels heard immediately. The Razorpay support team gets a perfectly formatted, structured ticket without doing any manual data entry. Zero human intervention from call to database. |

## 2. The Architecture (MVP)

**1. The Trigger (React Dashboard)**
- A custom web dashboard for the Razorpay team.
- A single "Call" button hits our Node.js backend.
- The backend sends a request to the Sarvam Outbound API, dynamically passing `agent_variables` (Merchant Name, Issue Type) into the AI's prompt context.

**2. The Voice AI (Sarvam)**
- An empathetic AI agent powered by Sarvam.
- Strictly prompted to extract: `merchant_name`, `merchant_id`, and `issue_description`.
- Provides human-like reassurance to the merchant before hanging up.

**3. The Automation (Webhook + Excel)**
- Upon call completion, Sarvam's post-call webhook fires the extracted JSON data to a custom Make.com listener.
- Make.com instantly parses the payload and appends a new row to a Microsoft Excel database in OneDrive.
- Ready for human Level 2 support to take action.

## 3. Demo Strategy for Judges
1. **Explain the Bottleneck:** Merchants losing money on hold.
2. **Click the Trigger:** Show the React app and initiate the call.
3. **The Voice Demo:** Answer the phone on speaker, act as a frustrated merchant, and provide a 4-digit alphanumeric ID.
4. **The Database Sync:** Switch to Excel and watch the structured ticket appear autonomously in 2 seconds.
