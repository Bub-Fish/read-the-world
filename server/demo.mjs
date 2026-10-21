import { countWords } from './domain.mjs';

const sentencePairs = (paragraphs) => paragraphs.flatMap((paragraph, index) => paragraph.map(([en, zh]) => ({ en, zh, paragraph: index + 1 })));
const vocabulary = (entries) => entries.map(([word, phonetic, pos, meaning, example]) => ({ word, phonetic, pos, meaning, example }));
const questions = (entries) => entries.map(([question, type, options, answer, explanation, evidence]) => ({ question, type, options, answer, explanation, evidence }));

const articles = [
  {
    id: 'demo-urban-nature', sourceId: 'guardian', sourceUrl: 'https://www.theguardian.com/environment', origin: 'demo',
    title: '当城市开始重新拥抱自然', titleEn: 'The quiet return of nature to our cities',
    summary: '从街角的野花到屋顶的花园，城市正在重新思考人与自然的关系。这些微小的改变，如何影响我们的生活？',
    category: '环境与自然', difficulty: '考研标准', publishedAt: null,
    sentences: sentencePairs([
      [
        ['For much of the twentieth century, a successful city was imagined as a place where nature had finally been brought under control.', '在二十世纪的大部分时间里，一座成功的城市被想象为一个自然终于得到控制的地方。'],
        ['Rivers were straightened, wetlands were drained, and carefully cut lawns replaced the complicated communities of plants that had once grown freely.', '河流被拉直，湿地被排干，精心修剪的草坪取代了曾经自由生长的复杂植物群落。'],
        ['This approach created an appearance of order, but it also removed many of the natural systems that had made urban life possible.', '这种做法营造出井然有序的外观，却也消除了许多原本支撑城市生活的自然系统。'],
        ['Today, a different understanding is emerging: the most resilient cities may be those that learn to make room for the living world.', '如今，一种不同的认识正在形成：最具韧性的城市，或许是那些学会为生命世界留出空间的城市。'],
      ],
      [
        ['The change can begin with something as ordinary as a narrow strip of land between a road and a line of houses.', '这种改变可以从一块再普通不过的土地开始，比如道路与一排住宅之间的狭长地带。'],
        ['When local authorities allow native flowers to grow there, the result is more than a small improvement in the appearance of the neighbourhood.', '当地方政府允许本土花卉在那里生长时，带来的结果远不只是社区面貌的一点改善。'],
        ['The flowers provide food for insects, which in turn support birds and help maintain a network of relationships that no artificial structure can fully reproduce.', '花朵为昆虫提供食物，昆虫又滋养鸟类，共同维系着一张任何人工结构都无法完全复制的关系网络。'],
        ['What looks untidy to one observer may therefore be evidence of an ecosystem that is beginning to recover from years of intensive management.', '因此，在某些观察者眼中显得杂乱的景象，可能恰恰是生态系统开始从多年高强度管理中恢复的证据。'],
      ],
      [
        ['There are practical benefits as well, particularly as cities experience longer periods of extreme heat and increasingly unpredictable patterns of heavy rainfall.', '这也带来了实际益处，尤其是在城市经历更长的极端高温期和愈发难以预测的强降雨之际。'],
        ['A tree cools the surrounding air through shade and evaporation, while healthy soil absorbs water that would otherwise flow directly into an overloaded drainage system.', '树木通过遮阴和蒸发冷却周围空气，而健康的土壤则吸收那些原本会直接流入超负荷排水系统的雨水。'],
        ['These services are often taken for granted because they do not arrive with a bill, although replacing them with technology can be remarkably expensive.', '这些服务常常被视为理所当然，因为它们不会附带账单，尽管用技术来替代它们可能极其昂贵。'],
        ['Recognising their economic value does not mean reducing nature to a financial calculation; it means acknowledging costs that conventional planning has frequently ignored.', '认识到它们的经济价值，并不意味着把自然简化为财务计算，而是意味着承认传统规划经常忽略的成本。'],
      ],
      [
        ['Yet the growing enthusiasm for greener cities raises an uncomfortable question about who actually gets to enjoy these improvements and who pays for them.', '然而，人们对绿色城市日益高涨的热情，也提出了一个令人不安的问题：究竟谁能够享受这些改善，又由谁承担代价？'],
        ['A new park can make a district more attractive to wealthy newcomers, pushing up rents and gradually displacing residents who have lived there for decades.', '一座新公园可能使某个街区更能吸引富裕的新居民，从而推高租金，并逐渐挤走在那里生活了数十年的原住居民。'],
        ['If environmental projects overlook this possibility, an initiative intended to improve public health may unintentionally deepen the inequalities it was supposed to help address.', '如果环境项目忽视了这种可能性，一项旨在改善公共健康的举措就可能无意中加深它原本应当帮助解决的不平等。'],
        ['Effective urban planning must therefore combine investment in green spaces with policies that protect affordable housing and give existing communities a meaningful voice in decisions.', '因此，有效的城市规划必须将绿地投资与保障可负担住房的政策结合起来，并赋予现有社区在决策中实质性的发言权。'],
      ],
      [
        ['Public participation matters for another reason: a landscape designed without local knowledge may fail even when its ecological principles appear perfectly sound on paper.', '公众参与还因另一个原因而重要：缺乏本地知识的景观设计，即便其生态原则在纸面上看似完全合理，也可能失败。'],
        ['Residents can explain where children play, which paths older people use, and why a particular empty space has become important to the community.', '居民能够说明孩子们在哪里玩耍、老年人使用哪些小路，以及某块空地为何对社区变得重要。'],
        ['Their experience can help planners distinguish between an attractive proposal and a place that people will genuinely care for over the course of many years.', '他们的经验可以帮助规划者区分一份引人注目的提案，与一个人们真正愿意长年悉心维护的地方。'],
        ['The aim should not be to recreate an imaginary wilderness, but to establish a lasting relationship between the people of a city and its other inhabitants.', '目标不应是重建一个想象中的荒野，而应是在城市居民与城市中的其他生命之间建立一种持久的关系。'],
      ],
      [
        ['None of this suggests that planting a few trees will solve every environmental problem, or that careful maintenance is no longer necessary in crowded urban areas.', '这一切并不意味着种几棵树就能解决所有环境问题，也不意味着人口密集的城市地区不再需要精心维护。'],
        ['It does suggest, however, that progress need not always involve replacing a natural process with a more complicated and energy intensive human invention.', '不过，这确实说明，进步并不总是要用更加复杂、能耗更高的人类发明来取代一种自然过程。'],
        ['Sometimes the most intelligent intervention is to remove an obstacle, allow an existing system to recover, and observe what it can accomplish with a little support.', '有时，最明智的干预是移除障碍，让现有系统恢复，并观察它在少许支持下能够实现什么。'],
        ['A city that welcomes nature is ultimately making a choice about its own future: whether to keep struggling against the living world or to learn how to flourish within it.', '一座欢迎自然的城市，最终是在为自身的未来作出选择：是继续与生命世界对抗，还是学习如何在其中繁荣发展。'],
      ],
    ]),
    vocabulary: vocabulary([
      ['resilient', '/rɪˈzɪliənt/', 'adj.', '有韧性的；能迅速恢复的', 'The most resilient cities make room for nature.'],
      ['emerging', '/ɪˈmɜːdʒɪŋ/', 'adj. / v.', '新兴的；逐渐显现', 'A different understanding is emerging.'],
      ['maintain', '/meɪnˈteɪn/', 'v.', '维持；维护', 'Insects help maintain a network of relationships.'],
      ['conventional', '/kənˈvenʃənəl/', 'adj.', '传统的；常规的', 'Conventional planning has frequently ignored these costs.'],
      ['acknowledging', '/əkˈnɒlɪdʒɪŋ/', 'v.', '承认；认识到', 'It means acknowledging the value of natural systems.'],
      ['displacing', '/dɪsˈpleɪsɪŋ/', 'v.', '使迁离；取代', 'Rising rents are gradually displacing local residents.'],
      ['initiative', '/ɪˈnɪʃətɪv/', 'n.', '倡议；新举措；主动性', 'An environmental initiative can improve public health.'],
      ['inequalities', '/ˌɪnɪˈkwɒlətiz/', 'n.', '不平等现象', 'Poor planning may deepen existing inequalities.'],
      ['participation', '/pɑːˌtɪsɪˈpeɪʃən/', 'n.', '参与；参加', 'Public participation matters in urban planning.'],
      ['flourish', '/ˈflʌrɪʃ/', 'v.', '繁荣；茁壮成长', 'We can learn how to flourish within the living world.'],
    ]),
    questions: questions([
      ['The author mentions the strip of land in Paragraph 2 mainly to show that ______.', '例证题', ['urban roads need more intensive management', 'small changes can restore important ecological relationships', 'native flowers are more attractive than artificial structures', 'local authorities should stop maintaining public land'], 1, '第二段通过路边狭长绿地的例子，说明小规模的改变也能让花卉、昆虫和鸟类之间的生态网络逐渐恢复。选 B。A 与原文相反；C 偷换重点；D 将“适度减少干预”夸大成“停止维护”。', 7],
      ['What concern does the author express about new green spaces?', '细节题', ['They may increase housing costs and force existing residents to leave.', 'They are unlikely to improve public health in crowded districts.', 'They require replacing every existing building in a neighbourhood.', 'They will inevitably make local governments less willing to invest.'], 0, '第四段指出，新公园可能吸引富裕人群，推高租金，使长期居民被迫迁离。A 准确对应 pushing up rents 和 displacing residents。其他选项没有原文依据。', 14],
      ['Which of the following best describes the author’s attitude towards welcoming nature into cities?', '态度题', ['Dismissive, because ecological services cannot be measured.', 'Unreservedly optimistic, because planting trees solves all problems.', 'Supportive, while emphasising social fairness and local participation.', 'Indifferent, since technological solutions are always more effective.'], 2, '作者肯定城市生态恢复的价值，同时用第四、五段讨论住房公平与公众参与，并在末段避免过度承诺。这是一种有条件、有思考的支持态度，故选 C。B 中 all problems 是典型的绝对化干扰。', 16],
    ]),
  },
  {
    id: 'demo-ai-thinking', sourceId: 'scientificamerican', sourceUrl: 'https://www.scientificamerican.com/', origin: 'demo',
    title: '当 AI 替我们思考，我们还需要学什么？', titleEn: 'What learning means when machines can answer',
    summary: '答案变得触手可及时，提问、判断与独立思考的价值反而更加凸显。重新理解人工智能时代的学习。',
    category: '科技与创新', difficulty: '挑战提升', publishedAt: null,
    sentences: sentencePairs([
      [
        ['A student facing a difficult question can now receive a confident answer from an artificial intelligence system in less time than it takes to open a textbook.', '如今，面对一道难题的学生，向人工智能系统获取一个自信的答案，所需的时间甚至比打开课本还短。'],
        ['For some observers, this represents an extraordinary opportunity to make high quality assistance available to anyone with an internet connection and a desire to learn.', '对一些观察者而言，这代表着一个非凡的机会：让任何拥有网络连接和学习愿望的人都能获得高质量的帮助。'],
        ['For others, it threatens the intellectual effort through which students have traditionally developed their understanding of the world and their confidence in their own abilities.', '在另一些人看来，它威胁到了学生历来用以理解世界、建立能力自信的智力努力。'],
        ['The disagreement reveals a more fundamental question that technology alone cannot answer: what exactly do we want the process of education to accomplish?', '这种分歧揭示了一个仅凭技术无法回答的更根本的问题：我们究竟希望教育过程实现什么？'],
      ],
      [
        ['It is tempting to define learning simply as the acquisition of information, especially when examinations reward students for producing a correct response within a limited time.', '人们很容易将学习简单定义为获取信息，尤其是在考试奖励那些能在有限时间内给出正确回答的学生时。'],
        ['Yet a person can repeat an accurate explanation without understanding why it is accurate, which assumptions support it, or when it might cease to be useful.', '然而，一个人可以复述准确的解释，却并不理解它为什么准确、由哪些假设支撑，以及在什么情况下可能不再适用。'],
        ['Knowledge becomes more valuable when it forms a structure that allows us to connect new observations with previous experience and to recognise patterns across different situations.', '当知识形成一种结构，使我们能够将新的观察与先前的经验联系起来，并识别不同情境中的规律时，它便更有价值。'],
        ['Building that structure usually involves uncertainty, mistakes, and the uncomfortable experience of discovering that an idea we once accepted does not actually withstand careful examination.', '构建这种结构通常伴随着不确定性、错误，以及一种令人不适的经历：发现我们曾经接受的观点实际上经不起仔细审视。'],
      ],
      [
        ['An intelligent assistant could strengthen this process by offering a different example, identifying a gap in an argument, or asking a question that encourages further investigation.', '智能助手可以通过提供不同的例子、指出论证中的缺口，或提出鼓励进一步探究的问题，来强化这一过程。'],
        ['The same assistant could also weaken it by supplying a polished response before the learner has had an opportunity to develop and test an explanation independently.', '同一个助手也可能在学习者有机会独立形成并检验解释之前，就提供一个精致的回答，从而削弱这一过程。'],
        ['The distinction depends less on the sophistication of the software than on the relationship between the tool, the task, and the person who is using it.', '这种区别与其说取决于软件的先进程度，不如说取决于工具、任务与使用者之间的关系。'],
        ['A calculator can support mathematical reasoning, for example, but pressing its buttons is not a substitute for understanding which calculation a particular problem actually requires.', '例如，计算器可以支持数学推理，但按动它的按钮并不能代替对某个具体问题究竟需要何种计算的理解。'],
      ],
      [
        ['This makes the design of educational activities increasingly important, because tasks that merely demand a finished answer provide little evidence of how that answer was reached.', '这使得教学活动的设计变得愈发重要，因为仅仅要求一个最终答案的任务，几乎无法证明这个答案是如何得出的。'],
        ['Teachers might instead ask students to compare alternative explanations, defend a choice of evidence, or describe how their understanding changed after encountering a serious objection.', '教师可以转而要求学生比较不同的解释、为自己选择的证据辩护，或描述遇到有力反驳后自己的理解发生了怎样的变化。'],
        ['Such activities do not make automated assistance irrelevant, but they make it harder to confuse the production of fluent language with the achievement of genuine comprehension.', '这类活动不会使自动化帮助失去意义，但它们会让人们更难将流畅语言的生成与真正理解的达成混为一谈。'],
        ['They also recognise that disagreement can be productive when learners are expected to explain their reasoning rather than simply announce that their conclusion is correct.', '它们还承认，当学习者被要求解释推理过程，而不只是宣称结论正确时，分歧可以富有成效。'],
      ],
      [
        ['There is another challenge: a system that speaks with confidence may produce statements that sound reasonable while lacking reliable evidence or overlooking an essential qualification.', '还有另一个挑战：一个语气自信的系统可能给出听起来合理、却缺乏可靠证据或忽略关键限定条件的陈述。'],
        ['Evaluating these statements requires background knowledge, attention to sources, and a willingness to admit that the most convenient answer may not be the most trustworthy one.', '评估这些陈述需要背景知识、对信息来源的关注，以及承认最便捷的答案未必最可信的意愿。'],
        ['The easier it becomes to obtain information, the more necessary it becomes to cultivate the judgment that allows us to decide what deserves our confidence.', '获取信息变得越容易，培养判断力就越有必要，因为判断力使我们能够决定什么值得信赖。'],
        ['Far from eliminating the need for subject knowledge, artificial intelligence may therefore make a solid foundation in science, history, language, and mathematics even more valuable.', '因此，人工智能非但没有消除学科知识的必要性，反而可能使科学、历史、语言和数学的坚实基础更有价值。'],
      ],
      [
        ['The appropriate response is neither to prohibit every new tool nor to assume that access to a powerful system automatically produces a better educated person.', '恰当的回应既不是禁止每一种新工具，也不是假定接触到强大的系统就会自动造就一个受过更好教育的人。'],
        ['We should design learning environments in which assistance remains available, but curiosity, effort, and responsibility continue to belong to the learner rather than the machine.', '我们应当设计这样的学习环境：帮助始终可得，但好奇心、努力和责任仍然属于学习者，而不是机器。'],
        ['The essential achievement of education is not the ability to deliver an answer as quickly as possible, but the capacity to understand what makes an answer worth accepting.', '教育的核心成就不是尽可能迅速地给出答案，而是理解什么使一个答案值得接受的能力。'],
        ['If new technology helps us pursue that purpose more deliberately, its greatest contribution may be to remind us why the difficult work of thinking still matters.', '如果新技术帮助我们更自觉地追求这一目标，那么它最大的贡献，或许就是提醒我们：艰难的思考为何仍然重要。'],
      ],
    ]),
    vocabulary: vocabulary([
      ['acquisition', '/ˌækwɪˈzɪʃən/', 'n.', '获得；习得；收购', 'Learning involves more than the acquisition of information.'],
      ['assumptions', '/əˈsʌmpʃənz/', 'n.', '假设；想当然的看法', 'We should examine the assumptions behind an explanation.'],
      ['uncertainty', '/ʌnˈsɜːtənti/', 'n.', '不确定性', 'Learning usually involves uncertainty and mistakes.'],
      ['investigation', '/ɪnˌvestɪˈɡeɪʃən/', 'n.', '调查；研究', 'A good question encourages further investigation.'],
      ['sophistication', '/səˌfɪstɪˈkeɪʃən/', 'n.', '精密；复杂；成熟', 'The sophistication of software is not the only factor.'],
      ['substitute', '/ˈsʌbstɪtjuːt/', 'n. / v.', '替代品；代替', 'A finished answer is not a substitute for understanding.'],
      ['comprehension', '/ˌkɒmprɪˈhenʃən/', 'n.', '理解；理解力', 'Fluent language does not always show genuine comprehension.'],
      ['qualification', '/ˌkwɒlɪfɪˈkeɪʃən/', 'n.', '限定条件；资格', 'The statement overlooks an essential qualification.'],
      ['cultivate', '/ˈkʌltɪveɪt/', 'v.', '培养；耕作', 'We need to cultivate independent judgment.'],
      ['deliberately', '/dɪˈlɪbərətli/', 'adv.', '有意识地；审慎地；故意地', 'Technology can help us pursue that purpose more deliberately.'],
    ]),
    questions: questions([
      ['The comparison with a calculator in Paragraph 3 suggests that ______.', '推断题', ['all educational tools eventually weaken independent thinking', 'advanced technology can replace the need to understand a task', 'using a tool is different from understanding the problem it addresses', 'mathematical reasoning should always be taught without technology'], 2, '计算器可以帮助推理，但按按钮不能替代理解题目需要什么运算。作者以此类比 AI：使用工具和理解问题是两回事。C 符合这一论证目的，A、B、D 都将原文观点绝对化。', 12],
      ['According to Paragraph 5, easier access to information makes it more important to ______.', '细节题', ['accept answers that are delivered confidently', 'develop the judgment needed to evaluate reliability', 'abandon traditional subject knowledge', 'avoid statements containing any uncertainty'], 1, '第五段指出，信息越容易获取，越需要培养判断力，以评估内容的证据与可信度。B 对应 cultivate the judgment。自信不等于可靠；作者同时强调学科基础仍然重要。', 19],
      ['Which title best captures the central argument of the passage?', '主旨题', ['Why Schools Must Stop Using Intelligent Assistants', 'The End of Textbooks in Modern Education', 'Faster Answers Are the Only Goal of Learning', 'Learning to Judge in an Age of Instant Answers'], 3, '全文由“AI 能迅速给答案”切入，讨论理解、推理与判断的价值，并强调教育的目标是理解什么使答案值得接受。D 覆盖全文核心；A 与作者不主张全面禁止工具的立场相反。', 23],
    ]),
  },
  {
    id: 'demo-slow-attention', sourceId: 'atlantic', sourceUrl: 'https://www.theatlantic.com/', origin: 'demo',
    title: '在快节奏世界里，找回深度阅读', titleEn: 'The overlooked value of reading slowly',
    summary: '我们每天接收的信息越来越多，真正理解的却未必更多。慢下来，或许是重建注意力的第一步。',
    category: '社会与文化', difficulty: '考研标准', publishedAt: null,
    sentences: sentencePairs([
      [
        ['On an ordinary morning, a reader may move through dozens of headlines, several messages, and a stream of short videos before finishing a single cup of coffee.', '在一个普通的早晨，读者可能还没喝完一杯咖啡，就已经浏览了数十条标题、好几条消息和一连串短视频。'],
        ['The experience creates a powerful impression of being informed, although very little of the information may remain available when it is needed later in the day.', '这种体验带来一种强烈的“掌握信息”的感觉，然而在当天晚些时候真正需要时，可能几乎想不起其中任何内容。'],
        ['This gap between exposure and understanding has encouraged renewed interest in a practice that seems almost out of place in contemporary life: reading something slowly.', '这种接触信息与理解信息之间的差距，促使人们重新关注一种在当代生活中似乎格格不入的做法：慢慢阅读。'],
        ['The argument for slow reading is not that speed is always harmful, but that different kinds of texts require different kinds of attention from their readers.', '支持慢阅读的论点并不是速度总是有害，而是不同类型的文本要求读者付出不同类型的注意力。'],
      ],
      [
        ['Scanning a railway timetable is useful precisely because the purpose is narrow and the relevant information can usually be located without examining every other detail.', '快速扫读火车时刻表之所以有用，恰恰是因为目的明确，而且通常无需查看其他每个细节就能找到相关信息。'],
        ['A complex argument works differently: its meaning depends on the relationship between statements, the qualifications attached to them, and the evidence that supports each step.', '复杂的论证则不同：它的意义取决于陈述之间的关系、附加的限定条件，以及支撑每个步骤的证据。'],
        ['If we approach such a text only by searching for a sentence that confirms an existing opinion, we may miss the very point the writer is trying to establish.', '如果我们阅读这类文本时，只寻找能够证实已有观点的句子，就可能错过作者试图确立的核心论点。'],
        ['Reading slowly provides time to notice these connections and to distinguish a carefully supported conclusion from a claim that merely sounds familiar or emotionally satisfying.', '慢阅读让我们有时间注意这些联系，区分有充分依据的结论，与那些仅仅听起来熟悉或令人情绪满足的断言。'],
      ],
      [
        ['The difficulty is that sustained attention competes with an environment in which almost every application has a reason to invite us to look somewhere else.', '困难在于，持续的注意力必须与这样一种环境竞争：几乎每个应用都有理由邀请我们将目光转向别处。'],
        ['A notification does not have to contain important news to interrupt a line of thought; its simple arrival can create the expectation that something more interesting awaits.', '一条通知不必包含重要消息就能打断思路；仅仅是它的到来，就能制造出“还有更有趣的东西在等着”的期待。'],
        ['Once that interruption occurs, returning to a demanding paragraph may require reconstructing the context that had been gradually assembled over several minutes of concentration.', '一旦发生这种打断，重新回到一段需要费心阅读的文字，可能就要重建先前花了几分钟专注才逐步形成的语境。'],
        ['Repeated interruptions therefore impose a cost that is not fully captured by counting the seconds spent checking a screen or responding to a short message.', '因此，反复的打断会带来一种成本，单凭查看屏幕或回复短消息所花的秒数，无法完整衡量这种成本。'],
      ],
      [
        ['Protecting reading time need not involve withdrawing from digital life or adopting a rigid routine that becomes another source of pressure in an already crowded schedule.', '保护阅读时间，并不必然意味着退出数字生活，或采取一种僵硬的日程，让它成为本已紧凑的安排中的另一个压力源。'],
        ['A more practical approach is to create a modest interval in which a single text has our attention and competing demands are temporarily placed out of reach.', '一种更实际的做法，是留出一小段时间，让一篇文本独占我们的注意力，并暂时将相互竞争的需求放到触及范围之外。'],
        ['Keeping a pencil nearby can help, not because every sentence deserves a note, but because writing a question encourages an active conversation with what we are reading.', '手边放一支铅笔会有所帮助，并非因为每句话都值得做笔记，而是因为写下问题能够鼓励我们与阅读内容展开主动的对话。'],
        ['At the end of a page, attempting to explain its main idea without looking back may reveal both what has become clear and what still needs another careful reading.', '读完一页后，尝试不回看就解释它的主旨，可能会揭示哪些内容已经清楚，哪些仍然需要再次仔细阅读。'],
      ],
      [
        ['For someone learning a second language, the temptation to rush can be especially strong, because visible progress is easily confused with the number of pages completed.', '对学习第二语言的人来说，匆忙推进的诱惑可能尤其强烈，因为人们很容易将看得见的进步与读完的页数混为一谈。'],
        ['Yet a short passage examined closely can offer repeated encounters with a useful expression, a subtle contrast, or an unfamiliar structure that would disappear during a hurried scan.', '然而，细读一段短文，可以让人反复接触一个实用表达、一处微妙对比，或一种在匆忙扫读中会被忽略的陌生结构。'],
        ['The aim is not to translate every word forever, but to develop a sensitivity to how ideas are organised and how small linguistic choices influence their meaning.', '目标不是永远翻译每个单词，而是培养一种敏感度：察觉观点如何组织，以及细微的语言选择如何影响意义。'],
        ['That sensitivity grows through regular engagement, much as musical understanding develops through attentive listening rather than through simply accumulating a longer list of songs.', '这种敏感度通过持续投入而成长，正如音乐理解力来自专注聆听，而非仅仅积累更长的歌单。'],
      ],
      [
        ['Of course, nobody can read everything deeply, and the ability to move quickly through less important material remains an essential part of managing information effectively.', '当然，没有人能深读所有内容，而快速浏览不太重要材料的能力，仍是有效管理信息的必要部分。'],
        ['What matters is having a choice, so that speed becomes a strategy we select rather than a habit that quietly determines every encounter with a written text.', '重要的是拥有选择权，使速度成为我们主动选择的策略，而不是悄然决定每次阅读体验的习惯。'],
        ['In a culture that rewards immediate reactions, spending ten uninterrupted minutes with an unfamiliar idea can be a modest but meaningful way of reclaiming that choice.', '在一种奖励即时反应的文化中，花十分钟不受打扰地接触一个陌生观点，是一种虽小却有意义的重新夺回这种选择权的方式。'],
        ['The reward is not merely remembering more of what we have read, but becoming more capable of deciding what deserves our attention in the first place.', '其回报不仅是记住更多读过的内容，更是增强判断力，知道什么从一开始就值得我们投入注意。'],
      ],
    ]),
    vocabulary: vocabulary([
      ['contemporary', '/kənˈtemprəri/', 'adj.', '当代的；同时代的', 'Slow reading seems unusual in contemporary life.'],
      ['relevant', '/ˈreləvənt/', 'adj.', '相关的；切题的', 'The relevant information can be located quickly.'],
      ['qualifications', '/ˌkwɒlɪfɪˈkeɪʃənz/', 'n.', '限定条件；资历', 'An argument depends on the qualifications attached to its claims.'],
      ['sustained', '/səˈsteɪnd/', 'adj.', '持续的；持久的', 'A complex text requires sustained attention.'],
      ['reconstructing', '/ˌriːkənˈstrʌktɪŋ/', 'v.', '重建；重新构想', 'Returning to a paragraph may require reconstructing the context.'],
      ['impose', '/ɪmˈpəʊz/', 'v.', '施加；强加', 'Repeated interruptions impose a hidden cost.'],
      ['rigid', '/ˈrɪdʒɪd/', 'adj.', '僵硬的；严格的；刻板的', 'A rigid routine may become a source of pressure.'],
      ['subtle', '/ˈsʌtəl/', 'adj.', '微妙的；不易察觉的', 'A close reading reveals a subtle contrast.'],
      ['accumulating', '/əˈkjuːmjəleɪtɪŋ/', 'v.', '积累；积聚', 'Learning is more than accumulating information.'],
      ['strategy', '/ˈstrætədʒi/', 'n.', '策略；战略', 'Speed should be a strategy we choose.'],
    ]),
    questions: questions([
      ['Why does the author refer to a railway timetable?', '例证题', ['To suggest that all texts should be read as quickly as possible.', 'To show that suitable reading speed depends on the reader’s purpose.', 'To argue that digital timetables are more useful than printed ones.', 'To demonstrate that detailed information is always unnecessary.'], 1, '第二段将目标明确的时刻表与关系复杂的论证对比，说明阅读速度应适应文本和阅读目的，B 正确。A 和 D 都把适用于部分情境的方式过度推广。', 5],
      ['The cost of repeated interruptions is underestimated because people often overlook ______.', '推断题', ['the amount of money required to buy digital devices', 'the time spent typing replies to messages', 'the effort needed to rebuild the context of their reading', 'the difficulty of finding more interesting information'], 2, '第三段说明，中断后需要重建先前逐步形成的语境，而这种认知成本无法仅按查看消息的秒数来衡量。因此 C 正确。B 是原文说“仅计算它还不够”的表层耗时。', 11],
      ['The author would most likely agree that effective reading involves ______.', '观点题', ['finishing the largest possible number of pages each day', 'avoiding every form of digital communication permanently', 'translating each word before considering an argument', 'choosing deliberately when to scan and when to read closely'], 3, '最后一段承认快速浏览不重要的材料仍然必要，关键在于掌握选择权。D 概括了灵活、有意识地选择阅读方式的观点；A、B、C 都是文中不赞成的机械做法。', 22],
    ]),
  },
];

export const demos = articles.map((article) => {
  const wordCount = countWords(article.sentences.map((sentence) => sentence.en).join(' '));
  return { ...article, wordCount, minutes: Math.round(wordCount / 70), createdAt: '2026-10-21T00:00:00.000Z' };
});
