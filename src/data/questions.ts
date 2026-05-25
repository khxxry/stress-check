export type Category = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: number;
  category: Category;
  text: string;
  options: string[];
  reverse?: boolean; // If true, higher raw score (4) means lower stress (needs inversion for some logic)
}

export const questions: Question[] = [
  // A: 仕事について (17 items)
  { id: 1, category: 'A', text: '非常にたくさんの仕事をしなければならない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 2, category: 'A', text: '時間内に仕事が処理しきれない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 3, category: 'A', text: '一生懸命働かなければならない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 4, category: 'A', text: 'かなり注意を集中する必要がある', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 5, category: 'A', text: '高度の知識や技術が必要な仕事だ', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 6, category: 'A', text: '勤務時間中はいつも仕事のことを考えていなければならない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 7, category: 'A', text: 'からだを大変よく使う仕事だ', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 8, category: 'A', text: '自分のペースで仕事ができる', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 9, category: 'A', text: '自分で仕事の順番・やり方を決めることができる', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 10, category: 'A', text: '職場の仕事の方針に自分の意見を反映できる', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 11, category: 'A', text: '自分の技能や知識を仕事で使うことが少ない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 12, category: 'A', text: '私の部署内では（部下、同僚、上司など）、お互いに理解しあっている', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 13, category: 'A', text: '私の部署内では、お互いに助け合っている', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 14, category: 'A', text: '私の部署の雰囲気は友好的である', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 15, category: 'A', text: '私の職場の作業環境（騒音、照明、温度、換気など）はよくない', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'] },
  { id: 16, category: 'A', text: '仕事の内容が自分にあっている', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },
  { id: 17, category: 'A', text: '働きがいのある仕事だ', options: ['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'], reverse: true },

  // B: 最近1か月間の状態 (29 items)
  { id: 18, category: 'B', text: '活気がわいてくる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'], reverse: true },
  { id: 19, category: 'B', text: '元気がいっぱいだ', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'], reverse: true },
  { id: 20, category: 'B', text: '生き生きする', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'], reverse: true },
  { id: 21, category: 'B', text: '怒りを感じる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 22, category: 'B', text: '内心腹立たしい', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 23, category: 'B', text: 'イライラしている', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 24, category: 'B', text: 'ひどく疲れを感じる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 25, category: 'B', text: 'へとへとだ', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 26, category: 'B', text: 'だるい', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 27, category: 'B', text: '気がはりつめている', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 28, category: 'B', text: '不安だ', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 29, category: 'B', text: '落ち着かない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 30, category: 'B', text: 'ゆううつだ', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 31, category: 'B', text: '何をするのも面倒だ', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 32, category: 'B', text: '物事に集中できない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 33, category: 'B', text: '気分が晴れない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 34, category: 'B', text: '仕事が手につかない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 35, category: 'B', text: '悲しいと感じる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 36, category: 'B', text: 'めまいがする', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 37, category: 'B', text: '体のふしぶしが痛む', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 38, category: 'B', text: '頭が重かったり頭痛がする', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 39, category: 'B', text: '首筋や肩がこる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 40, category: 'B', text: '腰が痛む', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 41, category: 'B', text: '目が疲れる', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 42, category: 'B', text: '動悸や息切れがする', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 43, category: 'B', text: '胃腸の具合がよくない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 44, category: 'B', text: '食欲がない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 45, category: 'B', text: '便秘や下痢をする', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },
  { id: 46, category: 'B', text: 'よく眠れない', options: ['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'] },

  // C: 周りの方々について (9 items)
  { id: 47, category: 'C', text: 'どのくらい気軽に話ができますか？（上司）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 48, category: 'C', text: 'どのくらい気軽に話ができますか？（同僚）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 49, category: 'C', text: 'どのくらい気軽に話ができますか？（配偶者、家族、友人等）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 50, category: 'C', text: 'あなたが困った時、どのくらい頼りになりますか？（上司）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 51, category: 'C', text: 'あなたが困った時、どのくらい頼りになりますか？（同僚）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 52, category: 'C', text: 'あなたが困った時、どのくらい頼りになりますか？（配偶者、家族、友人等）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 53, category: 'C', text: 'あなたの個人的な問題をどのくらいきいてくれますか？（上司）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 54, category: 'C', text: 'あなたの個人的な問題をどのくらいきいてくれますか？（同僚）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },
  { id: 55, category: 'C', text: 'あなたの個人的な問題をどのくらいきいてくれますか？（配偶者、家族、友人等）', options: ['非常に', 'かなり', '多少', '全くない'], reverse: true },

  // D: 満足度について (2 items)
  { id: 56, category: 'D', text: '仕事に満足している', options: ['満足', 'まあ満足', 'やや不満足', '不満足'], reverse: true },
  { id: 57, category: 'D', text: '今の生活に満足している', options: ['満足', 'まあ満足', 'やや不満足', '不満足'], reverse: true },
];
