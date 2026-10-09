/*
 * Editable sign data. Labels are multilingual meanings, not a claim that the
 * gesture illustrations are authoritative. Add a vetted image/video and an
 * approved, language-specific handshape description for each id before using
 * this content as instructional material.
 */
const LANGS = ['en','hi','es','fr','pt','ar','zh','bn'];
const LABELS = {
  'hello': ['Hello','नमस्ते','Hola','Bonjour','Olá','مرحبًا','你好','হ্যালো'],
  'thank-you': ['Thank you','धन्यवाद','Gracias','Merci','Obrigado/a','شكرًا','谢谢','ধন্যবাদ'],
  'please': ['Please','कृपया','Por favor','S’il vous plaît','Por favor','من فضلك','请','অনুগ্রহ করে'],
  'sorry': ['Sorry','माफ़ कीजिए','Lo siento','Désolé(e)','Desculpe','آسف','对不起','দুঃখিত'],
  'yes': ['Yes','हाँ','Sí','Oui','Sim','نعم','是','হ্যাঁ'],
  'no': ['No','नहीं','No','Non','Não','لا','不','না'],
  'help': ['Help','मदद','Ayuda','Aide','Ajuda','مساعدة','帮助','সাহায্য'],
  'water': ['Water','पानी','Agua','Eau','Água','ماء','水','জল'],
  'food': ['Food','खाना','Comida','Nourriture','Comida','طعام','食物','খাবার'],
  'eat': ['Eat','खाना खाना','Comer','Manger','Comer','يأكل','吃','খাওয়া'],
  'drink': ['Drink','पीना','Beber','Boire','Beber','يشرب','喝','পান করা'],
  'home': ['Home','घर','Hogar','Maison','Casa','المنزل','家','বাড়ি'],
  'family': ['Family','परिवार','Familia','Famille','Família','عائلة','家庭','পরিবার'],
  'mother': ['Mother','माँ','Madre','Mère','Mãe','أم','母亲','মা'],
  'father': ['Father','पिता','Padre','Père','Pai','أب','父亲','বাবা'],
  'friend': ['Friend','दोस्त','Amigo/a','Ami(e)','Amigo/a','صديق','朋友','বন্ধু'],
  'love': ['Love','प्यार','Amor','Amour','Amor','حب','爱','ভালোবাসা'],
  'good': ['Good','अच्छा','Bueno/a','Bon/ne','Bom/boa','جيد','好','ভালো'],
  'bad': ['Bad','बुरा','Malo/a','Mauvais/e','Mau','سيئ','坏','খারাপ'],
  'happy': ['Happy','खुश','Feliz','Heureux/se','Feliz','سعيد','开心','খুশি'],
  'sad': ['Sad','उदास','Triste','Triste','Triste','حزين','难过','দুঃখিত'],
  'stop': ['Stop','रुकिए','Parar','Arrêter','Pare','توقف','停止','থামুন'],
  'go': ['Go','जाना','Ir','Aller','Ir','اذهب','走','যাওয়া'],
  'come': ['Come','आना','Venir','Venir','Vir','تعال','来','আসা'],
  'name': ['Name','नाम','Nombre','Nom','Nome','اسم','名字','নাম'],
  'what': ['What?','क्या?','¿Qué?','Quoi ?','O quê?','ماذا؟','什么？','কি?'],
  'where': ['Where?','कहाँ?','¿Dónde?','Où ?','Onde?','أين؟','哪里？','কোথায়?'],
  'when': ['When?','कब?','¿Cuándo?','Quand ?','Quando?','متى؟','什么时候？','কখন?'],
  'why': ['Why?','क्यों?','¿Por qué?','Pourquoi ?','Por quê?','لماذا؟','为什么？','কেন?'],
  'how': ['How?','कैसे?','¿Cómo?','Comment ?','Como?','كيف؟','怎么？','কীভাবে?'],
  'who': ['Who?','कौन?','¿Quién?','Qui ?','Quem?','من؟','谁？','কে?'],
  'school': ['School','स्कूल','Escuela','École','Escola','مدرسة','学校','স্কুল'],
  'work': ['Work','काम','Trabajo','Travail','Trabalho','عمل','工作','কাজ'],
  'doctor': ['Doctor','डॉक्टर','Médico/a','Médecin','Médico/a','طبيب','医生','ডাক্তার'],
  'hospital': ['Hospital','अस्पताल','Hospital','Hôpital','Hospital','مستشفى','医院','হাসপাতাল'],
  'medicine': ['Medicine','दवा','Medicamento','Médicament','Medicamento','دواء','药','ওষুধ'],
  'money': ['Money','पैसे','Dinero','Argent','Dinheiro','مال','钱','টাকা'],
  'today': ['Today','आज','Hoy','Aujourd’hui','Hoje','اليوم','今天','আজ'],
  'tomorrow': ['Tomorrow','कल','Mañana','Demain','Amanhã','غدًا','明天','আগামীকাল'],
  'again': ['Again','फिर से','Otra vez','Encore','De novo','مرة أخرى','再来一次','আবার'],
  'emergency': ['Emergency','आपातकाल','Emergencia','Urgence','Emergência','حالة طارئة','紧急情况','জরুরি অবস্থা'],
  'police': ['Police','पुलिस','Policía','Police','Polícia','الشرطة','警察','পুলিশ'],
  'toilet': ['Toilet','शौचालय','Baño','Toilettes','Banheiro','مرحاض','厕所','শৌচাগার'],
  'pain': ['Pain','दर्द','Dolor','Douleur','Dor','ألم','疼痛','ব্যথা'],
  'understand': ['Understand','समझना','Entender','Comprendre','Entender','يفهم','理解','বোঝা'],
  'repeat': ['Repeat','दोहराएँ','Repetir','Répéter','Repetir','أعد','重复','আবার বলুন'],
  'slow': ['Slowly','धीरे','Despacio','Lentement','Devagar','ببطء','慢一点','ধীরে'],
  'wait': ['Wait','इंतज़ार करें','Esperar','Attendre','Esperar','انتظر','等待','অপেক্ষা করুন'],
  'welcome': ['Welcome','स्वागत है','Bienvenido/a','Bienvenue','Bem-vindo/a','أهلًا وسهلًا','欢迎','স্বাগতম'],
  'goodbye': ['Goodbye','अलविदा','Adiós','Au revoir','Tchau','مع السلامة','再见','বিদায়'],
  'morning': ['Morning','सुबह','Mañana','Matin','Manhã','صباح','早上','সকাল'],
  'night': ['Night','रात','Noche','Nuit','Noite','ليل','夜晚','রাত'],
  'bathroom': ['Bathroom','बाथरूम','Cuarto de baño','Salle de bain','Banheiro','حمام','洗手间','বাথরুম'],
  'sick': ['Sick','बीमार','Enfermo/a','Malade','Doente','مريض','生病','অসুস্থ'],
  'tired': ['Tired','थका हुआ','Cansado/a','Fatigué/e','Cansado/a','متعب','累','ক্লান্ত'],
  'cold': ['Cold','ठंडा','Frío','Froid','Frio','بارد','冷','ঠান্ডা'],
  'hot': ['Hot','गर्म','Caliente','Chaud','Quente','حار','热','গরম'],
  'hungry': ['Hungry','भूखा','Tengo hambre','J’ai faim','Estou com fome','جائع','饿','ক্ষুধার্ত'],
  'thirsty': ['Thirsty','प्यासा','Tengo sed','J’ai soif','Estou com sede','عطشان','渴','তৃষ্ণার্ত'],
  'finish': ['Finish','समाप्त','Terminar','Terminer','Terminar','انتهى','完成','শেষ'],
  'learn': ['Learn','सीखना','Aprender','Apprendre','Aprender','تعلّم','学习','শেখা'],
  'deaf': ['Deaf','बधिर','Sordo/a','Sourd/e','Surdo/a','أصم','聋','বধির'],
  'safe': ['Safe','सुरक्षित','Seguro/a','En sécurité','Seguro/a','آمن','安全','নিরাপদ'],
  'call': ['Call','फ़ोन करें','Llamar','Appeler','Ligar','اتصل','呼叫','ফোন করুন'],
  'please-help': ['Please help','कृपया मदद करें','Por favor, ayuda','Aidez-moi, s’il vous plaît','Por favor, ajude','الرجاء المساعدة','请帮帮我','দয়া করে সাহায্য করুন']
};
const SENTENCES = [
 ['how-are-you','greetings',['How are you?','आप कैसे हैं?','¿Cómo estás?','Comment allez-vous ?','Como você está?','كيف حالك؟','你好吗？','আপনি কেমন আছেন?']],
 ['my-name-is','daily',['My name is…','मेरा नाम … है','Me llamo…','Je m’appelle…','Meu nome é…','اسمي…','我的名字是……','আমার নাম …']],
 ['nice-to-meet-you','greetings',['Nice to meet you','आपसे मिलकर अच्छा लगा','Encantado/a de conocerte','Enchanté(e) de vous rencontrer','Prazer em conhecer você','سعيد بلقائك','很高兴认识你','আপনার সঙ্গে দেখা হয়ে ভালো লাগল']],
 ['i-need-help','emergency',['I need help','मुझे मदद चाहिए','Necesito ayuda','J’ai besoin d’aide','Preciso de ajuda','أحتاج إلى مساعدة','我需要帮助','আমার সাহায্য দরকার']],
 ['i-am-hungry','food',['I am hungry','मुझे भूख लगी है','Tengo hambre','J’ai faim','Estou com fome','أنا جائع','我饿了','আমার খিদে পেয়েছে']],
 ['where-is-the-toilet','places',['Where is the toilet?','शौचालय कहाँ है?','¿Dónde está el baño?','Où sont les toilettes ?','Onde fica o banheiro?','أين المرحاض؟','厕所在哪里？','শৌচাগার কোথায়?']],
 ['thank-you-very-much','greetings',['Thank you very much','बहुत-बहुत धन्यवाद','Muchas gracias','Merci beaucoup','Muito obrigado/a','شكرًا جزيلًا','非常感谢','অনেক ধন্যবাদ']],
 ['i-do-not-understand','daily',['I do not understand','मुझे समझ नहीं आया','No entiendo','Je ne comprends pas','Não entendo','لا أفهم','我不明白','আমি বুঝতে পারছি না']],
 ['please-repeat','daily',['Please repeat','कृपया दोहराएँ','Por favor, repite','Veuillez répéter','Por favor, repita','يرجى الإعادة','请重复一遍','দয়া করে আবার বলুন']],
 ['i-am-deaf','daily',['I am deaf','मैं बधिर हूँ','Soy sordo/a','Je suis sourd(e)','Sou surdo/a','أنا أصم','我是聋人','আমি বধির']],
 ['call-a-doctor','health',['Call a doctor','डॉक्टर को बुलाएँ','Llama a un médico','Appelez un médecin','Chame um médico','اتصل بطبيب','请叫医生','একজন ডাক্তার ডাকুন']],
 ['i-love-you','feelings',['I love you','मैं तुमसे प्यार करता/करती हूँ','Te quiero','Je t’aime','Eu amo você','أحبك','我爱你','আমি তোমাকে ভালোবাসি']],
 ['i-need-water','food',['I need water','मुझे पानी चाहिए','Necesito agua','J’ai besoin d’eau','Preciso de água','أحتاج إلى ماء','我需要水','আমার জল দরকার']],
 ['please-wait','daily',['Please wait','कृपया प्रतीक्षा करें','Por favor, espera','Veuillez patienter','Por favor, espere','يرجى الانتظار','请等一下','দয়া করে অপেক্ষা করুন']],
 ['stop-please','emergency',['Stop, please','कृपया रुकें','Para, por favor','Arrêtez, s’il vous plaît','Pare, por favor','توقف من فضلك','请停下','দয়া করে থামুন']],
 ['where-is-hospital','health',['Where is the hospital?','अस्पताल कहाँ है?','¿Dónde está el hospital?','Où est l’hôpital ?','Onde fica o hospital?','أين المستشفى؟','医院在哪里？','হাসপাতাল কোথায়?']],
 ['i-am-in-pain','health',['I am in pain','मुझे दर्द हो रहा है','Tengo dolor','J’ai mal','Estou com dor','أشعر بالألم','我很疼','আমার ব্যথা হচ্ছে']],
 ['i-am-lost','emergency',['I am lost','मैं रास्ता भटक गया/गई हूँ','Estoy perdido/a','Je suis perdu(e)','Estou perdido/a','لقد تهت','我迷路了','আমি পথ হারিয়েছি']],
 ['call-the-police','emergency',['Call the police','पुलिस को बुलाएँ','Llama a la policía','Appelez la police','Chame a polícia','اتصل بالشرطة','请报警','পুলিশ ডাকুন']],
 ['i-need-medicine','health',['I need medicine','मुझे दवा चाहिए','Necesito medicina','J’ai besoin de médicaments','Preciso de remédio','أحتاج إلى دواء','我需要药','আমার ওষুধ দরকার']]
];
const WORD_CATEGORIES = {
  'hello':'greetings','thank-you':'greetings','please':'greetings','sorry':'greetings','yes':'daily','no':'daily','help':'emergency','water':'food','food':'food','eat':'food','drink':'food',
  'home':'places','family':'family','mother':'family','father':'family','friend':'family','love':'feelings','good':'feelings','bad':'feelings','happy':'feelings','sad':'feelings','stop':'emergency',
  'go':'daily','come':'daily','name':'daily','what':'questions','where':'questions','when':'questions','why':'questions','how':'questions','who':'questions','school':'places','work':'daily','doctor':'health','hospital':'health','medicine':'health',
  'money':'daily','today':'daily','tomorrow':'daily','again':'daily','emergency':'emergency','police':'emergency','toilet':'places','pain':'health','understand':'daily','repeat':'daily','slow':'daily','wait':'daily',
  'welcome':'greetings','goodbye':'greetings','morning':'greetings','night':'greetings','bathroom':'places','sick':'health','tired':'feelings','cold':'health','hot':'health','hungry':'food','thirsty':'food','finish':'daily','learn':'daily','deaf':'daily','safe':'emergency','call':'emergency','please-help':'emergency'
};
const DESCRIPTIONS = {
 en:'Instruction placeholder: add a verified handshape, position, and movement description for this sign.',
 hi:'निर्देश का स्थानापन्न: इस संकेत के सत्यापित हाथ के आकार, स्थिति और गति का विवरण जोड़ें।',
 es:'Descripción provisional: añade una descripción verificada de la forma, posición y movimiento de la mano.',
 fr:'Description provisoire : ajoutez une description vérifiée de la forme, de la position et du mouvement de la main.',
 pt:'Descrição provisória: adicione uma descrição verificada da forma, posição e movimento da mão.',
 ar:'وصف مؤقت: أضف وصفًا موثوقًا لشكل اليد وموضعها وحركتها لهذه الإشارة.',
 zh:'说明占位内容：请添加经核实的手形、位置和动作描述。',
 bn:'নির্দেশনার স্থানধারক: এই সাইনের হাতের আকার, অবস্থান ও গতির যাচাইকৃত বিবরণ যোগ করুন।'
};
const DIGIT_NAMES = [
 ['Zero','शून्य','Cero','Zéro','Zero','صفر','零','শূন্য'],['One','एक','Uno','Un','Um','واحد','一','এক'],['Two','दो','Dos','Deux','Dois','اثنان','二','দুই'],['Three','तीन','Tres','Trois','Três','ثلاثة','三','তিন'],['Four','चार','Cuatro','Quatre','Quatro','أربعة','四','চার'],['Five','पाँच','Cinco','Cinq','Cinco','خمسة','五','পাঁচ'],['Six','छह','Seis','Six','Seis','ستة','六','ছয়'],['Seven','सात','Siete','Sept','Sete','سبعة','七','সাত'],['Eight','आठ','Ocho','Huit','Oito','ثمانية','八','আট'],['Nine','नौ','Nueve','Neuf','Nove','تسعة','九','নয়']
];
function labelsFromArray(values) { return Object.fromEntries(LANGS.map((l,i)=>[l,values[i] ?? values[0]])); }
function entry(id, category, values, mode, type) {
  const labels = Array.isArray(values) ? labelsFromArray(values) : values;
  const imageCategory = type === 'number' ? 'numbers' : type;
  const imageExt = mode === 'asl' && (type === 'alphabet' || type === 'number') ? '.svg' : '.webp';
  const imageId = type === 'alphabet' ? id.toLowerCase() : (type === 'number' ? id : id);
  const baseCategory = type === 'number' ? 'numbers' : type;
  return { id, category, labels, description: { ...DESCRIPTIONS }, image: `./images/${mode}/${baseCategory}/${imageId}${imageExt}`, video: null };
}
function buildForMode(mode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => entry(ch.toLowerCase(), 'alphabet', Object.fromEntries(LANGS.map(l=>[l,ch])), mode, 'alphabet'));
  const numbers = DIGIT_NAMES.map((names,i) => ({ ...entry(String(i),'numbers',names,mode,'number'), labels: labelsFromArray(names), symbol: String(i) }));
  const words = Object.entries(LABELS).map(([id, labels])=>entry(id, WORD_CATEGORIES[id] || 'daily', labels, mode, 'words'));
  const sentences = SENTENCES.map(([id,cat,labels])=>entry(id,cat,labels,mode,'sentences'));
  return { alphabet, numbers, words, sentences };
}
export const SIGN_LIBRARY = { asl: buildForMode('asl'), isl: buildForMode('isl') };
export const SUPPORTED_LANGUAGES = LANGS;
export const CATEGORY_LABELS = { greetings:'Greetings', family:'Family', food:'Food', health:'Health', emergency:'Emergency', numbers:'Numbers', places:'Places', feelings:'Feelings', questions:'Questions', daily:'Everyday', alphabet:'Alphabet', words:'Words', sentences:'Sentences' };
