# [mvu_update][mvu_start] 变量zod (让AI了解变量结构，别关)

id=36 | order=490 | position=after_char | depth=None | constant=True | selective=True | disable=None
keys=[] | secondary=[]

---

<变量 Zod Schema>

// ========== 基础类型 ==========
const 百分比数值 = z.coerce.number().transform(v => _.clamp(v, 0, 100));
const 可选文本 = z.string().prefault('无');
const 年份 = z.coerce.number().transform(v => _.clamp(v, 2000, 2100));
const 月份 = z.coerce.number().transform(v => _.clamp(v, 1, 12));
const 日期 = z.coerce.number().transform(v => _.clamp(v, 1, 31));
const 万元金额 = z.coerce.number().prefault(0);
const 时间格式 = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
  .or(z.literal('无'))
  .prefault('无');

// ========== 关系扩展 Schema ==========
export const 官场关系Schema = z
  .object({
    关系类型: 可选文本,
    关系来源: 可选文本,
    立场倾向: 可选文本,
    威胁等级: 可选文本,
    敌对原因: 可选文本,
    已知弱点: 可选文本,
    利用价值: 可选文本,
    可托付事项: 可选文本,
    近期动向: 可选文本,
  })
  .prefault({});

export const 绯色关系Schema = z
  .object({
    外貌: 可选文本,
    性格: 可选文本,
    身份标签: z.array(z.string()).prefault([]),
    初识场景: 可选文本,
    关系阶段: 可选文本,
    关系性质: 可选文本,
    情绪状态: 可选文本,
    危险度: 百分比数值.prefault(0),
    性癖好: z
      .record(
        z.string(),
        z.object({
          癖好描述: 可选文本,
          敏感程度: 可选文本,
        }),
      )
      .prefault({}),
    通联方式: 可选文本,
    通联详情: 可选文本,
    经济往来: 可选文本,
    把柄: z
      .object({
        我方掌握: 可选文本,
        对方掌握: 可选文本,
      })
      .prefault({}),
    利益纠葛: 可选文本,
    安置情况: 可选文本,
    近期事件: 可选文本,
  })
  .prefault({});

export const 竞争关系Schema = z
  .object({
    竞争目标: 可选文本,
    竞争理由: 可选文本,
    竞争态势: 可选文本,
    对方优势: 可选文本,
    对方软肋: 可选文本,
    背后靠山: 可选文本,
  })
  .prefault({});

export const 靠山关系Schema = z
  .object({
    紧密度: 可选文本,
    提携内容: 可选文本,
    预期回报: 可选文本,
  })
  .prefault({});

export const 家庭关系Schema = z
  .object({
    关系: 可选文本,
    知悉内情: 可选文本,
    政治资源: 可选文本,
    态度: 可选文本,
    风险等级: 可选文本,
  })
  .prefault({});

export const 子女Schema = z
  .record(
    z.string(),
    z.object({
      姓名: 可选文本,
      性别: 性别枚举.prefault('无'),
      年龄: z.coerce.number().prefault(0),
      状态: 可选文本,
      知悉内情: 可选文本,
      与我关系: 可选文本,
    }),
  )
  .prefault({});

// ========== 统一人物 Schema ==========
export const 人物Schema = z.object({
  姓名: 可选文本,
  性别: 性别枚举.prefault('无'),
  年龄: z.coerce.number().prefault(0),
  体系: 体系枚举.prefault('无'),
  级别: 可选文本,
  职务: 可选文本,
  单位: 可选文本,
  派系: 可选文本,
  状态: 可选文本,
  婚姻状态: 婚姻状态枚举.prefault('无'),
  好感度: 百分比数值.prefault(50),
  信任度: 百分比数值.prefault(50),
  忠诚度: 百分比数值.prefault(0),
  当前状态: 可选文本,
  角色标签: z.array(z.string()).prefault([]),
  官场关系: 官场关系Schema.optional(),
  绯色关系: 绯色关系Schema.optional(),
  竞争关系: 竞争关系Schema.optional(),
  靠山关系: 靠山关系Schema.optional(),
  家庭关系: 家庭关系Schema.optional(),
  子女: 子女Schema.optional(),
});

// ========== 自动清理逻辑 ==========

const 计算政治气候 = (年: number) => {
  if (年 <= 0 || 年 < 2000) return '无';
  if (年 >= 2000 && 年 <= 2012) return '狂飙年代';
  if (年 >= 2013 && 年 <= 2017) return '雷霆震荡';
  if (年 >= 2018 && 年 <= 2022) return '大考淬炼';
  return '存量博弈';
};

const 人情债条目Schema = z.object({
  债主: 可选文本,
  欠债内容: 可选文本,
  债务性质: 可选文本,
  偿还压力: 可选文本,
  已偿还: z.boolean().prefault(false),
});

// ========== 主 Schema ==========
export const GameSchema = z.object({
  时空舆情: z
    .object({
      当前日期: z
        .object({
          年: 年份.prefault(0),
          月: 月份.prefault(0),
          日: 日期.prefault(0),
          星期: 可选文本,
        })
        .prefault({}),
      当前时间: 时间格式,
      当前地点: 可选文本,
      政治气候: 政治气候枚举.prefault('无'),
      重大事件: 可选文本,
      中央动态: 可选文本,
      省内风向: 可选文本,
      本地新闻: 可选文本,
      圈内传闻: 可选文本,
      个人风评: 可选文本,
    })
    .transform(data => {
      const 年 = data.当前日期?.年;
      if (年 && 年 >= 2000) {
        return { ...data, 政治气候: 计算政治气候(年) };
      }
      return data;
    })
    .prefault({}),

  当前场景: z
    .object({
      场景类型: 可选文本,
      场景速写: 可选文本,
      气氛基调: 可选文本,
      在场人物: z.array(z.string()).prefault([]),
      潜在议题: 可选文本,
    })
    .prefault({}),

  人物库: z
    .record(z.string(), 人物Schema)
    .prefault({}),

  关系索引: z
    .object({
      一把手: 可选文本,
      直接上级: 可选文本,
      配偶: 可选文本,
      靠山列表: z.array(z.string()).prefault([]),
      竞争对手列表: z.array(z.string()).prefault([]),
      绯色对象列表: z.array(z.string()).prefault([]),
      核心嫡系列表: z.array(z.string()).prefault([]),
      政治宿敌列表: z.array(z.string()).prefault([]),
    })
    .prefault({}),

  个人档案: z
    .object({
      基本信息: z
        .object({
          姓名: 可选文本,
          性别: 性别枚举.prefault('无'),
          年龄: z.coerce.number().prefault(0),
          民族: 可选文本,
          籍贯: 可选文本,
          学历: 可选文本,
          毕业院校: 可选文本,
          入党时间: 可选文本,
          参加工作时间: 可选文本,
        })
        .prefault({}),

      能力评估: z
        .object({
          公文笔杆: 百分比数值.prefault(0),
          揣摩上意: 百分比数值.prefault(0),
          资源整合: 百分比数值.prefault(0),
          人脉经营: 百分比数值.prefault(0),
          政治敏感: 百分比数值.prefault(0),
          执行魄力: 百分比数值.prefault(0),
          酒桌功夫: 百分比数值.prefault(0),
          魅力风度: 百分比数值.prefault(0),
          表演功底: 百分比数值.prefault(0),
          厚黑指数: 百分比数值.prefault(0),
        })
        .prefault({}),

      现任职务: z
        .object({
          职务名称: 可选文本,
          任职单位: 可选文本,
          体系: 体系枚举.prefault('无'),
          级别: 可选文本,
          编制类型: 可选文本,
          任职时间: 可选文本,
          任期预期: 可选文本,
          前任情况: 可选文本,
          前任遗留: 可选文本,
          兼任职务: z
            .record(
              z.string(),
              z.object({
                职务名称: 可选文本,
              }),
            )
            .prefault({}),
          分管领域: z
            .record(
              z.string(),
              z.object({
                领域名称: 可选文本,
              }),
            )
            .prefault({}),
        })
        .prefault({}),

      晋升状态: z
        .object({
          是否冻结: z.boolean().prefault(false),
          冻结原因: 可选文本,
          预计解除: 可选文本,
          下一目标: 可选文本,
        })
        .prefault({}),

      政治生态: z
        .object({
          派系归属: 可选文本,
          政治立场: 可选文本,
          官声: 可选文本,
          群众基础: 可选文本,
          年度考核: 可选文本,
          班子内站位: 可选文本,
        })
        .prefault({}),

      任职履历: z
        .record(
          z.string(),
          z.object({
            职务名称: 可选文本,
            单位: 可选文本,
            体系: 体系枚举.prefault('无'),
            级别: 可选文本,
            起始年月: 可选文本,
            结束年月: 可选文本,
            主要政绩: 可选文本,
            离任原因: 可选文本,
          }),
        )
        .prefault({}),

      在手项目: z
        .record(
          z.string(),
          z.object({
            项目名称: 可选文本,
            角色定位: 可选文本,
            进展状态: 可选文本,
            政治效益: 可选文本,
            风险等级: 可选文本,
            预计完成: 可选文本,
            关联人物: z.array(z.string()).prefault([]),
          }),
        )
        .prefault({}),

      表彰记录: z
        .record(
          z.string(),
          z.object({
            名称: 可选文本,
            授予单位: 可选文本,
            时间: 可选文本,
          }),
        )
        .prefault({}),

      处分记录: z
        .record(
          z.string(),
          z.object({
            处分类型: 可选文本,
            处分原因: 可选文本,
            处分时间: 可选文本,
            影响期限: 可选文本,
          }),
        )
        .prefault({}),
    })
    .prefault({}),

  派系图谱: z
    .object({
      我方派系: z
        .object({
          派系名称: 可选文本,
          核心人物: 可选文本,
          势力范围: 可选文本,
          实力评估: 可选文本,
          近期动向: 可选文本,
        })
        .prefault({}),
      主要派系: z
        .record(
          z.string(),
          z.object({
            派系名称: 可选文本,
            核心人物: 可选文本,
            势力范围: 可选文本,
            实力评估: 可选文本,
            与我派系关系: 可选文本,
            近期动向: 可选文本,
          }),
        )
        .prefault({}),
    })
    .prefault({}),

  绯色履历: z
    .record(
      z.string(),
      z.object({
        对象: 可选文本,
        起始时间: 可选文本,
        结束时间: 可选文本,
        关系性质: 可选文本,
        结局: 可选文本,
        遗留问题: 可选文本,
      }),
    )
    .prefault({}),

  个人资产: z
    .object({
      申报资产: 万元金额,
      实际资产: 万元金额,
      灰色资产: 万元金额,
      现居住地: 可选文本,
      房产: z
        .record(
          z.string(),
          z.object({
            位置: 可选文本,
            面积: 可选文本,
            估值: 万元金额,
            来源: 可选文本,
            登记人: 可选文本,
          }),
        )
        .prefault({}),
      座驾: z
        .record(
          z.string(),
          z.object({
            品牌型号: 可选文本,
            来源: 可选文本,
          }),
        )
        .prefault({}),
      白手套: z
        .record(
          z.string(),
          z.object({
            人物ID: 可选文本,
            代持内容: 可选文本,
            代持金额: 万元金额,
            可靠程度: 可选文本,
          }),
        )
        .prefault({}),
    })
    .prefault({}),

  暗账: z
    .object({
      被握把柄: z
        .record(
          z.string(),
          z.object({
            把柄内容: 可选文本,
            把柄类型: 可选文本,
            掌握者: 可选文本,
            致命程度: 可选文本,
            暴露风险: 可选文本,
            当前状态: 可选文本,
          }),
        )
        .prefault({}),
      手握把柄: z
        .record(
          z.string(),
          z.object({
            把柄内容: 可选文本,
            目标人物: 可选文本,
            致命程度: 可选文本,
            可用性: 可选文本,
          }),
        )
        .prefault({}),
      政治地雷: z
        .record(
          z.string(),
          z.object({
            内容: 可选文本,
            性质: 可选文本,
            来源: 可选文本,
            引爆条件: 可选文本,
            杀伤力: 可选文本,
          }),
        )
        .prefault({}),
      人情债: z
        .record(z.string(), 人情债条目Schema)
        .transform(record => {
          const filtered: Record<string, z.infer<typeof 人情债条目Schema>> = {};
          for (const [key, value] of Object.entries(record)) {
            if (!value.已偿还) filtered[key] = value;
          }
          return filtered;
        })
        .prefault({}),
    })
    .prefault({}),

  机遇与危机: z
    .object({
      当前机遇: z
        .record(
          z.string(),
          z.object({
            机遇名称: 可选文本,
            机遇内容: 可选文本,
            机遇等级: 可选文本,
            来源渠道: 可选文本,
            时效性: 可选文本,
            所需资源: 可选文本,
            潜在代价: 可选文本,
          }),
        )
        .prefault({}),
      潜在危机: z
        .record(
          z.string(),
          z.object({
            危机名称: 可选文本,
            危机内容: 可选文本,
            危机等级: 可选文本,
            危机来源: 可选文本,
            引爆概率: 可选文本,
            应对思路: 可选文本,
          }),
        )
        .prefault({}),
      待办事项: z
        .record(
          z.string(),
          z.object({
            事项: 可选文本,
            紧急程度: 可选文本,
            截止时间: 可选文本,
            关联人物: z.array(z.string()).prefault([]),
          }),
        )
        .prefault({}),
    })
    .prefault({}),
});

export type GameData = z.infer<typeof GameSchema>;
export type 人物 = z.infer<typeof 人物Schema>;
export type 绯色关系 = z.infer<typeof 绯色关系Schema>;
<变量 Zod Schema>
