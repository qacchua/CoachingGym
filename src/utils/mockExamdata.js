import generatedQuestions from './icf_question_bank.json';

const originalQuestions = [
  // ==========================================
  // DOMAIN 1: COACHING ETHICS (30%)
  // ==========================================
  {
    id: "ETH-001",
    domain: "Coaching Ethics",
    question: "A corporate sponsor is paying for their employee's coaching. After three sessions, the sponsor calls the coach and asks for a detailed report on what the employee has been discussing regarding their struggles with management. According to the ICF Code of Ethics, how should the coach respond?",
    options: [
      "Provide a high-level summary of the sessions without giving specific details.",
      "Refuse to share any information, citing strict coach-client confidentiality.",
      "Refer back to the initial sponsor agreement regarding what information was agreed to be shared, and only share that specific data.",
      "Ask the sponsor to join the next session so the client can share the information directly."
    ],
    correctIndex: 2,
    explanation: "The ICF Code of Ethics requires coaches to have clear agreements with sponsors regarding confidentiality and how information will be exchanged."
  },
  {
    id: "ETH-002",
    domain: "Coaching Ethics",
    question: "A coach realizes they are experiencing severe burnout and it is impacting their ability to remain present and objective during client sessions. What is the coach's ethical obligation?",
    options: [
      "Push through the current contracts but refuse to take on new clients.",
      "Immediately seek professional assistance and determine whether to suspend or terminate their coaching relationships.",
      "Inform clients of the burnout at the start of each session so they are aware of the potential impact.",
      "Refund all clients 50% of their fees for the affected sessions."
    ],
    correctIndex: 1,
    explanation: "ICF Ethics require coaches to recognize personal impairment and promptly seek professional help, suspending or terminating coaching relationships if necessary."
  },
  {
    id: "ETH-003",
    domain: "Coaching Ethics",
    question: "During a session, a client casually mentions that they have been deliberately embezzling small amounts of money from their employer. What is the coach's primary ethical responsibility?",
    options: [
      "Report the client to the employer immediately to prevent further harm.",
      "Maintain strict confidentiality as this information was shared within the trusted coaching space.",
      "Report the crime to local law enforcement anonymously.",
      "Adhere to applicable laws and the coaching agreement regarding exceptions to confidentiality, which may require reporting."
    ],
    correctIndex: 3,
    explanation: "Confidentiality has limits. Coaches must understand and follow local laws and their coaching agreement regarding illegal activities and mandatory reporting."
  },
  {
    id: "ETH-004",
    domain: "Coaching Ethics",
    question: "A coach's former client, who finished their engagement two years ago, asks to connect on a professional networking site and offers the coach a highly lucrative consulting contract. Is the coach ethically permitted to accept?",
    options: [
      "No, this represents a permanent conflict of interest.",
      "Yes, provided the coach ensures the new relationship does not compromise the confidentiality of the past coaching relationship.",
      "Yes, but only if the coach offers the consulting services at a discounted rate.",
      "No, coaches cannot engage in consulting work with former clients for at least five years."
    ],
    correctIndex: 1,
    explanation: "Coaches must remain alert to conflicts of interest even after the coaching relationship ends, but secondary relationships are permitted if boundaries and confidentiality are maintained."
  },
  {
    id: "ETH-005",
    domain: "Coaching Ethics",
    question: "How should a coach ethically manage their electronic client records and session notes?",
    options: [
      "Keep them stored safely on a personal laptop that only the coach uses.",
      "Maintain, store, and dispose of records in a manner that promotes confidentiality and complies with any applicable privacy laws.",
      "Delete all notes immediately after each session concludes to guarantee absolute privacy.",
      "Share them with the client's HR department for safe keeping in the employee's permanent file."
    ],
    correctIndex: 1,
    explanation: "The ICF requires secure data management that aligns with global privacy regulations (like GDPR) and strict confidentiality agreements."
  },

  // ==========================================
  // DOMAIN 2: DEFINITION AND BOUNDARIES (30%)
  // ==========================================
  {
    id: "BND-001",
    domain: "Definition and Boundaries",
    question: "A client repeatedly brings up a deeply traumatic childhood event during sessions. They state that they cannot move forward with their career goals until they heal from this past trauma. What is the most appropriate action for the coach?",
    options: [
      "Use empathetic coaching techniques to help the client process the trauma.",
      "Politely change the subject back to the client's future-focused career goals.",
      "Recommend the client seek the services of a qualified mental health professional.",
      "Offer to act as a mentor to share personal experiences of overcoming trauma."
    ],
    correctIndex: 2,
    explanation: "Healing past trauma falls under the purview of therapy/counseling. A coach must recognize when a client needs a mental health professional and refer them appropriately."
  },
  {
    id: "BND-002",
    domain: "Definition and Boundaries",
    question: "A client hires a coach to help them improve their company's marketing strategy. During the first session, the client asks, 'What specific marketing channels do you think I should invest in?' How should the coach respond to maintain the boundary between coaching and consulting?",
    options: [
      "Provide a list of the top three marketing channels based on current industry trends.",
      "Tell the client they must figure it out entirely on their own without any input.",
      "Ask the client what criteria they are currently using to evaluate potential marketing channels.",
      "Offer to build the marketing strategy for an additional fee."
    ],
    correctIndex: 2,
    explanation: "Consultants provide expert answers; coaches ask powerful questions to evoke the client's own awareness and solutions."
  },
  {
    id: "BND-003",
    domain: "Definition and Boundaries",
    question: "At what point in the coaching relationship should the coach explain the distinction between coaching, consulting, and therapy?",
    options: [
      "Only if the client asks for advice.",
      "During the initial contracting or discovery phase before coaching formally begins.",
      "After the first session, once rapport is established.",
      "Only if the coach notices the client confusing the roles."
    ],
    correctIndex: 1,
    explanation: "Establishing the boundaries and definitions of coaching must happen upfront as part of establishing the coaching agreement."
  },
  {
    id: "BND-004",
    domain: "Definition and Boundaries",
    question: "A client states they are no longer finding value in the coaching sessions and feel they have reached their goals early. The coach believes the client still has work to do. What should the coach do?",
    options: [
      "Convince the client to finish the remaining sessions in the contract.",
      "Honor the client's right to terminate the coaching relationship at any point.",
      "Refuse to terminate the agreement until the coach feels the client is ready.",
      "Switch to a consulting approach to provide more immediate value."
    ],
    correctIndex: 1,
    explanation: "The ICF Code of Ethics dictates that coaches must respect the client's right to terminate the coaching relationship at any time, for any reason."
  },
  {
    id: "BND-005",
    domain: "Definition and Boundaries",
    question: "Who is primarily responsible for generating the goals and action steps during a coaching engagement?",
    options: [
      "The coach, based on their expertise.",
      "The client's sponsor or manager.",
      "The coach and client equally.",
      "The client, with the coach facilitating the process."
    ],
    correctIndex: 3,
    explanation: "Coaching is built on the premise that the client is creative, resourceful, and whole. The client is responsible for their own choices and actions."
  },

  // ==========================================
  // DOMAIN 3: COACHING COMPETENCIES (40%)
  // ==========================================
  {
    id: "CMP-001",
    domain: "Coaching Competencies",
    question: "During a session, a client says, 'I'm really excited about this new project,' but their voice is flat, their shoulders are slumped, and they are looking at the floor. A coach demonstrating 'Active Listening' would:",
    options: [
      "Congratulate the client on their excitement and move to action planning.",
      "Share an observation about the disconnect between the client's words and their body language.",
      "Assume the client is tired and suggest ending the session early.",
      "Ask the client to speak louder and with more enthusiasm."
    ],
    correctIndex: 1,
    explanation: "Active Listening includes noticing non-verbal cues, energy shifts, and what is not being said, and sharing those observations with the client."
  },
  {
    id: "CMP-002",
    domain: "Coaching Competencies",
    question: "A client is struggling to decide between two job offers. To demonstrate the competency of 'Evokes Awareness,' the coach should ask:",
    options: [
      "Which job pays more money?",
      "Have you considered making a pros and cons list?",
      "Who do you become if you choose the first job versus the second?",
      "Don't you think the second job sounds less stressful?"
    ],
    correctIndex: 2,
    explanation: "Evoking awareness involves asking questions that help the client explore beyond their current thinking, focusing on their identity, values, and deeper perspectives rather than just surface-level logistics."
  },
  {
    id: "CMP-003",
    domain: "Coaching Competencies",
    question: "To 'Establish and Maintain Agreements' for a specific session, what must the coach do at the beginning of the call?",
    options: [
      "Review the notes from the previous session.",
      "Partner with the client to identify or reconfirm what they want to accomplish today.",
      "Tell the client what topic will be most useful to cover based on their overall goals.",
      "Ensure the client has completed their homework."
    ],
    correctIndex: 1,
    explanation: "The coach must partner with the client to define the specific goal, focus, and measure of success for that individual session."
  },
  {
    id: "CMP-004",
    domain: "Coaching Competencies",
    question: "A client is expressing deep sadness and frustration about a recent failure. To demonstrate 'Maintains Presence,' the coach should:",
    options: [
      "Quickly help the client find the 'silver lining' to cheer them up.",
      "Share a story of when the coach also failed to show empathy.",
      "Allow space for silence and remain comfortably present with the client's strong emotions.",
      "Redirect the conversation to a more positive topic to keep the session productive."
    ],
    correctIndex: 2,
    explanation: "Maintaining presence requires the coach to manage their own emotions, be comfortable in a space of 'not knowing,' and demonstrate confidence working with strong client emotions without rushing to fix them."
  },
  {
    id: "CMP-005",
    domain: "Coaching Competencies",
    question: "At the end of a session, a coach asks, 'What are you taking away from our conversation today, and how will you apply it?' This demonstrates which competency?",
    options: [
      "Cultivates Trust and Safety",
      "Embodies a Coaching Mindset",
      "Listens Actively",
      "Facilitates Client Growth"
    ],
    correctIndex: 3,
    explanation: "Facilitating Client Growth involves partnering with the client to summarize learning and insight, and designing goals or actions that integrate that new learning."
  },
// ==========================================
  // BATCH 2: COACHING ETHICS 
  // ==========================================
  {
    id: "ETH-006",
    domain: "Coaching Ethics",
    question: "A coach is acting as an internal coach within a large organization. The coach's manager asks for a report on the specific leadership challenges a coachee is facing with their team. What is the most ethical response?",
    options: [
      "Provide the report since the manager is technically the sponsor paying the coach's salary.",
      "Refuse to provide the report, citing the ICF Code of Ethics regarding strict confidentiality, sharing only what the coachee explicitly agreed could be shared.",
      "Ask the coachee to write the report themselves.",
      "Share the information but leave out the coachee's name."
    ],
    correctIndex: 1,
    explanation: "Internal coaches face unique pressures, but the ICF Code of Ethics mandates that confidentiality agreements remain strict, regardless of who is paying the coach's salary."
  },
  {
    id: "ETH-007",
    domain: "Coaching Ethics",
    question: "A potential client wants to hire a coach to help them launch a local coffee shop. The coach is a silent investor in a competing coffee shop across town. What should the coach do?",
    options: [
      "Not say anything to keep their investor role separate from coaching.",
      "Share their role as an investor and acknowledge the possibility of a conflict of interest, allowing the client to decide.",
      "Accept the client but intentionally avoid discussing marketing strategies.",
      "Tell the client they cannot coach them under any circumstances."
    ],
    correctIndex: 1,
    explanation: "Coaches must proactively disclose any potential or actual conflicts of interest and offer to step away if the client wishes, rather than hiding the information."
  },
  {
    id: "ETH-008",
    domain: "Coaching Ethics",
    question: "A coach discovers that a client is using the coaching sessions entirely to vent about colleagues without making any forward progress. What is the coach's ethical obligation?",
    options: [
      "Keep coaching them as long as they are paying their invoice on time.",
      "Terminate the coaching relationship immediately.",
      "Have a transparent conversation about the value of the coaching engagement and whether it is still serving the client.",
      "Shift to a consulting approach and tell the client how to fix their attitude."
    ],
    correctIndex: 2,
    explanation: "Coaches are ethically obligated to ensure the client is still receiving value from the coaching relationship and must address it if the relationship becomes unproductive."
  },
  {
    id: "ETH-009",
    domain: "Coaching Ethics",
    question: "During the discovery call, a coach realizes they have a strong personal bias against the potential client's stated religious or political views, which they feel could impair their objectivity. What is the ethical course of action?",
    options: [
      "Take the client to challenge the coach's own personal biases.",
      "Refer the client to another qualified professional.",
      "Take the client but explicitly refuse to discuss those specific topics.",
      "Report the client to the ICF."
    ],
    correctIndex: 1,
    explanation: "If a coach recognizes a personal bias or impairment that will prevent them from remaining objective and professional, they are required to decline the engagement and refer the client."
  },
  {
    id: "ETH-010",
    domain: "Coaching Ethics",
    question: "A coach has completed 40 hours of coach-specific training but has not yet received their official ICF credential. How should they represent themselves ethically on their website?",
    options: [
      "ICF Certified Coach",
      "ICF ACC Candidate",
      "Coach with 40 hours of ICF-approved training",
      "Master Life Coach"
    ],
    correctIndex: 2,
    explanation: "Coaches must accurately state their qualifications. Claiming to be 'Certified' or a 'Candidate' implies formal recognition by the ICF that has not yet been granted."
  },

  // ==========================================
  // BATCH 2: DEFINITION AND BOUNDARIES 
  // ==========================================
  {
    id: "BND-006",
    domain: "Definition and Boundaries",
    question: "A client repeatedly misses their agreed-upon action steps. The client asks the coach to text them every morning at 7 AM to hold them accountable. What is the most appropriate boundary-setting response?",
    options: [
      "Agree to text them, as accountability is a core part of coaching.",
      "Decline the request and explore what is getting in the way of the client holding themselves accountable.",
      "Charge an extra fee for the daily texting service.",
      "Tell the client they are failing at the coaching process."
    ],
    correctIndex: 1,
    explanation: "The client is responsible for their own accountability. The coach's role is to explore the underlying behavioral patterns, not to act as a parent or alarm clock."
  },
  {
    id: "BND-007",
    domain: "Definition and Boundaries",
    question: "A client says they are feeling incredibly overwhelmed, crying frequently during the day, and unable to get out of bed. They want coaching to help them 'push through it.' What is the coach's responsibility?",
    options: [
      "Build a strict daily routine to force the client out of bed.",
      "Empathize and gently suggest they explore these feelings with a licensed mental health professional.",
      "Share a personal story of how the coach overcame depression.",
      "Ask the client what their ideal morning looks like."
    ],
    correctIndex: 1,
    explanation: "Severe emotional distress and an inability to function are clear indicators for therapy. A coach must refer clients to mental health professionals when these boundaries are crossed."
  },
  {
    id: "BND-008",
    domain: "Definition and Boundaries",
    question: "An organization hires a coach for an executive. The HR director says, 'We need you to fix their communication style by teaching them our corporate feedback model.' How should the coach respond to clarify the coaching boundary?",
    options: [
      "I will ensure they master the corporate feedback model.",
      "Coaching is about facilitating the client's own awareness and growth, not training them on a specific corporate model.",
      "I can do that, but my hourly rate will be higher for training.",
      "I will tell the executive that HR thinks they are a poor communicator."
    ],
    correctIndex: 1,
    explanation: "Training involves teaching specific skills or models. Coaching assumes the client is whole and helps them find their own authentic communication style."
  },
  {
    id: "BND-009",
    domain: "Definition and Boundaries",
    question: "A client asks the coach, 'Based on your experience with other leaders, what is the best way to handle a toxic employee?' What is the most appropriate coaching response?",
    options: [
      "In my experience, the best approach is to document everything and put them on a PIP.",
      "What approaches have you considered so far?",
      "You should ask your HR department that question.",
      "I am strictly not allowed to give you advice."
    ],
    correctIndex: 1,
    explanation: "While a coach may occasionally share observations, their primary role is to evoke the client's own awareness and resourcefulness rather than giving direct consulting advice."
  },
  {
    id: "BND-010",
    domain: "Definition and Boundaries",
    question: "A coach and client have a 6-month contract. After 3 months, the client says they have achieved their goals and want to stop. The coach feels there is more work to do. What should the coach do?",
    options: [
      "Require the client to finish the 6 months as per the contract.",
      "Honor the client's right to terminate the relationship and offer a closing session.",
      "Convince the client that they are self-sabotaging by quitting early.",
      "Stop responding to the client's emails."
    ],
    correctIndex: 1,
    explanation: "The ICF Code of Ethics requires coaches to respect the client's right to terminate the coaching relationship at any time, subject to the provisions of the agreement."
  },

  // ==========================================
  // BATCH 2: COACHING COMPETENCIES 
  // ==========================================
  {
    id: "CMP-006",
    domain: "Coaching Competencies",
    question: "Fifteen minutes into a session, a client pivots away from the agreed topic ('preparing for a performance review') and starts talking at length about a conflict with a colleague. What is the coach's best response?",
    options: [
      "Let the client continue, following their energy regardless of the agenda.",
      "Acknowledge what the client is sharing, then ask whether they want to spend the session on the colleague situation or return to the performance review.",
      "Interrupt and say, 'We agreed to talk about your performance review, let's stick to that.'",
      "Note the change and immediately end the session."
    ],
    correctIndex: 1,
    explanation: "Establishing and Maintaining Agreements means the coach must partner with the client to re-contract when the topic shifts, rather than assuming the new topic is what the client wants to focus on."
  },
  {
    id: "CMP-007",
    domain: "Coaching Competencies",
    question: "A client mentions for the third time in a session that they 'never ask for help.' The coach has noticed this pattern across multiple sessions. To evoke awareness, what is the coach's best response?",
    options: [
      "I notice you've mentioned not asking for help a few times. What do you make of that?",
      "Why don't you ever ask for help?",
      "You really need to start asking for help if you want to succeed.",
      "I don't ask for help very often either."
    ],
    correctIndex: 0,
    explanation: "Evoking awareness involves sharing observations and patterns without judgment, and inviting the client to explore the meaning behind those patterns."
  },
  {
    id: "CMP-008",
    domain: "Coaching Competencies",
    question: "A client achieves a massive, challenging goal and comes to the session celebrating. To demonstrate 'Facilitating Client Growth,' the coach should:",
    options: [
      "Celebrate with them and immediately move to setting the next big goal.",
      "Ask the client what they learned about themselves through the process of achieving this goal.",
      "Take credit for helping the client get there.",
      "Warn the client not to get overconfident."
    ],
    correctIndex: 1,
    explanation: "Facilitating Client Growth requires the coach to partner with the client to summarize learning and insight, translating an external achievement into internal awareness."
  },
  {
    id: "CMP-009",
    domain: "Coaching Competencies",
    question: "At the beginning of the session, the client states their goal is to 'feel better about my job.' To properly 'Establish and Maintain Agreements,' the coach should:",
    options: [
      "Say, 'Great, let's talk about what's making you feel bad.'",
      "Ask, 'What would need to happen in the next 45 minutes for you to know we've achieved that?'",
      "Give them a personality assessment to see why they are unhappy.",
      "Tell the client that 'feeling better' isn't a SMART goal and force them to change it."
    ],
    correctIndex: 1,
    explanation: "A coach must partner with the client to identify a measurable, specific outcome or measure of success for that exact session, even if the initial goal is vague."
  },
  {
    id: "CMP-010",
    domain: "Coaching Competencies",
    question: "During a session, the client becomes silent, looks away, and their eyes well up with tears. To demonstrate 'Maintains Presence,' the coach should:",
    options: [
      "Quickly hand them a tissue and tell them it's going to be okay.",
      "Change the subject to something lighter to protect the client's feelings.",
      "Allow the silence, holding a safe space without rushing to fix the emotion.",
      "End the session immediately to give them privacy."
    ],
    correctIndex: 2,
    explanation: "Maintaining presence requires the coach to be comfortable working in a space of strong emotions, allowing silence and not rushing to 'fix' or rescue the client."
  },
]
export const accMockExamDatabase = [...originalQuestions, ...generatedQuestions];