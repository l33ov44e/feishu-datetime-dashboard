import { dashboard, DashboardState, base, SourceType } from "@lark-base-open/js-sdk";
import type { FilterOperator, FilterConjunction } from "@lark-base-open/js-sdk";
import React, { useState, useEffect, useCallback } from "react";
import { Button, Input, InputNumber, Select, Switch, Form, Space, Spin, Typography, Card, RadioGroup, Radio, DatePicker } from "@douyinfe/semi-ui";
import { useTheme, useConfig } from "./hooks/index";
import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import "./App.scss";
import classnames from "classnames";
import { debounce } from "lodash";

// 常用时区列表 - 使用中文标签
const TIME_ZONES = [
  { value: 'UTC', label: '协调世界时 (UTC)' },
  { value: 'Asia/Shanghai', label: '中国标准时间 (GMT+8)' },
  { value: 'Asia/Tokyo', label: '日本时间 (GMT+9)' },
  { value: 'Asia/Seoul', label: '韩国标准时间 (GMT+9)' },
  { value: 'America/New_York', label: '纽约时间 (GMT-5/-4)' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间 (GMT-8/-7)' },
  { value: 'Europe/London', label: '伦敦时间 (GMT+0/+1)' },
  { value: 'Europe/Paris', label: '巴黎时间 (GMT+1/+2)' },
];

// 默认配置
const DEFAULT_CONFIG = {
  timeZone: 'Asia/Shanghai',
  showDate: true,
  showTime: true,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm:ss',
  fontSize: 24,
  fontFamily: 'Arial, sans-serif',
  fontColor: '#000000',
  showTimeZone: true, // 添加时区显示开关
  dataSourceType: 'current', // 'current' | 'table' | 'custom' 数据源类型
  tableName: '',
  fieldName: '',
  rowIndex: 0, // 选择的行号（从0开始）
  // 筛选器配置
  useFilter: false, // 是否启用筛选器
  filterOperator: 'isGreater' as const, // 筛选操作符
  filterValue: null as number | null, // 筛选日期值（时间戳）
  currentDateName: '当前时间',
  tableDateName: '数据更新时间',
  customDateTime: '', // 自定义时间
  customDateName: '自定义时间', // 自定义时间标签
};

interface IDateTimeConfig {
  timeZone: string;
  showDate: boolean;
  showTime: boolean;
  dateFormat: string;
  timeFormat: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  showTimeZone: boolean; // 添加时区显示开关
  dataSourceType: string; // 'current' | 'table' | 'custom' 数据源类型
  tableName: string;
  fieldName: string;
  rowIndex: number; // 选择的行号
  // 筛选器配置
  useFilter: boolean; // 是否启用筛选器
  filterOperator: 'is' | 'isGreater' | 'isLess' | 'isEmpty' | 'isNotEmpty'; // 筛选操作符
  filterValue: number | null; // 筛选日期值（时间戳）
  currentDateName: string;
  tableDateName: string;
  customDateTime: string; // 自定义时间
  customDateName: string; // 自定义时间标签
}

function App() {
  const { bgColor } = useTheme();

  const [config, setConfig] = useState<IDateTimeConfig>(DEFAULT_CONFIG);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<{id: string, name: string}[]>([]);
  const [fields, setFields] = useState<{id: string, name: string, type: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableDate, setTableDate] = useState<string | null>(null);
  const [isConfig, setIsConfig] = useState(false);

  // 检查是否处于配置模式
  useEffect(() => {
    const checkAndLoadTables = async () => {
      try {
        console.log('Dashboard state:', dashboard.state);
        const isCreate = dashboard.state === DashboardState.Create;
        const configMode = dashboard.state === DashboardState.Config || isCreate;
        console.log('Is config mode:', configMode, 'isCreate:', isCreate);
        setIsConfig(configMode);
        
        // 如果是配置模式，立即加载表格列表
        if (configMode) {
          console.log('Starting to load tables...');
          await loadTables();
        }
      } catch (e) {
        console.error('Error in dashboard state check:', e);
        setError('无法访问飞书仪表盘API: ' + (e instanceof Error ? e.message : String(e)));
      }
    };
    
    checkAndLoadTables();
  }, []);

  // 获取数据表列表
  const loadTables = async () => {
    try {
      setLoading(true);
      const tableList = await base.getTableList();
      console.log('获取到的表格列表:', tableList);
      console.log('第一个表格对象:', tableList[0]);
      
      // 从Table对象中获取id和name
      const validTables = await Promise.all(
        tableList.map(async (table: any) => {
          try {
            // 尝试获取表格的ID和名称
            const tableId = table.id || (table.context && table.context[0]);
            const tableName = await table.getName();
            
            console.log('处理表格:', { tableId, tableName });
            
            if (tableId && tableName) {
              return {
                id: String(tableId),
                name: String(tableName)
              };
            }
            return null;
          } catch (e) {
            console.error('获取表格信息失败:', e);
            return null;
          }
        })
      );
      
      // 过滤掉null值
      const filteredTables = validTables.filter(t => t !== null) as {id: string, name: string}[];
      
      console.log('有效的表格列表:', filteredTables);
      setTables(filteredTables);
    } catch (err) {
      console.error('获取数据表列表失败:', err);
      setError('获取数据表列表失败: ' + (err instanceof Error ? err.message : String(err)));
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  // 根据表ID获取字段列表
  const loadFields = async (tableId: string) => {
    if (!tableId) {
      setFields([]);
      return;
    }
    
    try {
      setLoading(true);
      // 获取指定表的元信息
      const table = await base.getTable(tableId);
      const fieldList = await table.getFieldMetaList();
      console.log('获取到的字段列表:', fieldList);
      
      // 筛选日期类型字段并验证数据
      // 5=日期, 1001=创建时间, 1002=最后修改时间, 1003=创建人, 1004=修改人
      const dateFields = fieldList
        .filter((field: any) => {
          const isDateField = field && field.id && field.name && 
            (field.type === 5 || field.type === 1001 || field.type === 1002);
          return isDateField;
        })
        .map((field: any) => ({
          id: String(field.id),
          name: String(field.name),
          type: field.type
        }));
      
      console.log('筛选后的日期字段:', dateFields);
      setFields(dateFields);
    } catch (err) {
      console.error('获取字段列表失败:', err);
      setError('获取字段列表失败: ' + (err instanceof Error ? err.message : String(err)));
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取表格中的日期数据
  const loadTableDate = async () => {
    if (!config.tableName || !config.fieldName || config.dataSourceType !== 'table') {
      return;
    }

    try {
      setLoading(true);
      
      // 构建筛选器配置
      const filterInfo = config.useFilter && config.fieldName && config.filterOperator ? {
        conjunction: 'and' as FilterConjunction,
        conditions: [{
          fieldId: config.fieldName,
          operator: config.filterOperator as any,
          value: config.filterValue || undefined,
          fieldType: undefined
        }]
      } : undefined;
      
      console.log('应用筛选器:', filterInfo);
      
      // 使用 getPreviewData 获取数据
      const previewData = await dashboard.getPreviewData([{
        tableId: config.tableName,
        dataRange: { 
          type: SourceType.ALL,
          filterInfo: filterInfo
        },
        groups: []
      }]);
      
      console.log('预览数据:', previewData);
      
      // previewData[0] 是表头，previewData[1]开始是数据行
      if (previewData && previewData.length > 1) {
        const rowIndex = config.rowIndex || 0;
        // 实际数据从索引1开始，所以要+1
        const dataRow = previewData[rowIndex + 1];
        
        if (dataRow && dataRow[0]) {
          const cellData = dataRow[0];
          const dateStr = cellData.text || cellData.value || '';
          console.log(`获取第${rowIndex}行数据:`, dateStr);
          setTableDate(String(dateStr));
        } else {
          console.log('没有找到指定行的数据');
          setTableDate(null);
        }
      }
    } catch (err) {
      console.error('获取表格日期数据失败:', err);
      setTableDate(null);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (res: any) => {
    const { customConfig } = res;
    if (customConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...customConfig });
    }
  };

  try {
    useConfig(updateConfig);
  } catch (e) {
    setError(prev => prev || '配置钩子错误: ' + (e instanceof Error ? e.message : String(e)));
  }

  // 更新时钟
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 当表格选择变化时加载字段
  useEffect(() => {
    if (isConfig && config.tableName) {
      loadFields(config.tableName);
    }
  }, [isConfig, config.tableName]);

  // 加载表格日期数据
  useEffect(() => {
    if (!isConfig) {
      loadTableDate();
    }
  }, [config.dataSourceType, config.tableName, config.fieldName, config.rowIndex, config.useFilter, config.filterOperator, config.filterValue, isConfig]);

  // 格式化时间显示
  const formatDateTime = () => {
    try {
      // 如果是自定义时间
      if (config.dataSourceType === 'custom' && config.customDateTime) {
        return config.customDateTime;
      }
      
      // 如果是表格数据源且有数据，则显示表格数据
      if (config.dataSourceType === 'table' && tableDate) {
        return tableDate;
      }
      
      const options: Intl.DateTimeFormatOptions = {
        timeZone: config.timeZone,
      };
      
      if (config.showDate) {
        switch (config.dateFormat) {
          case 'YYYY-MM-DD':
            options.year = 'numeric';
            options.month = '2-digit';
            options.day = '2-digit';
            break;
          case 'MM/DD/YYYY':
            options.year = 'numeric';
            options.month = '2-digit';
            options.day = '2-digit';
            break;
          case 'DD/MM/YYYY':
            options.year = 'numeric';
            options.month = '2-digit';
            options.day = '2-digit';
            break;
          case 'MMM DD, YYYY':
            options.year = 'numeric';
            options.month = 'short';
            options.day = '2-digit';
            break;
        }
      }
      
      if (config.showTime) {
        switch (config.timeFormat) {
          case 'HH:mm:ss':
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
            options.hour12 = false;
            break;
          case 'hh:mm:ss A':
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
            options.hour12 = true;
            break;
          case 'HH:mm':
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = false;
            break;
        }
      }
      
      return new Intl.DateTimeFormat('zh-CN', options).format(currentTime);
    } catch (e) {
      return 'Invalid Timezone';
    }
  };

  const debounceSetConfig = useCallback(
    debounce((newConfig: IDateTimeConfig) => {
      setConfig(newConfig);
    }, 500),
    []
  );

  function saveConfig() {
    // 保存配置
    dashboard.saveConfig({
      customConfig: config,
      dataConditions: [],
    } as any);
  }

  // 处理表选择变化
  const handleTableChange = (value: string | number | readonly string[] | undefined | Record<string, any>) => {
    const stringValue = value as string;
    const newConfig = {...config, tableName: stringValue, fieldName: ''};
    setConfig(newConfig);
    setFields([]); // 清空字段列表
  };

  // 处理字段选择变化
  const handleFieldChange = (value: string | number | readonly string[] | undefined | Record<string, any>) => {
    setConfig({...config, fieldName: value as string});
  };

  return (
    <main style={{backgroundColor: bgColor}} className={classnames({"main-config": isConfig, main: true})}>
      <div className="content">
        {error ? (
          <div style={{ padding: 20, color: 'red' }}>
            <h2>发生错误</h2>
            <p>{error}</p>
            <p>这可能是因为插件未在飞书环境中运行。</p>
          </div>
        ) : (
          <div className="datetime-container">
            <div 
              className="date-text" 
              style={{ 
                color: config.fontColor,
                fontWeight: 600,
                letterSpacing: '0.02em',
                wordBreak: 'break-word',
                textAlign: 'center',
                lineHeight: 1.2
              }}
            >
              {loading ? <Spin size="large" /> : formatDateTime()}
            </div>
            <div className="date-label" style={{
              textAlign: 'center',
              color: config.fontColor,
              opacity: 0.65,
              fontWeight: 500
            }}>
              {config.dataSourceType === 'custom' ? config.customDateName : 
               config.dataSourceType === 'current' ? config.currentDateName : config.tableDateName}
            </div>
          </div>
        )}
      </div>
      
      {isConfig && (
        <div className="config-panel">
          <Typography.Title heading={4} style={{ marginBottom: 20 }}>配置设置</Typography.Title>
          <Form className="form">
            <div className="form-item">
              <Form.Label className="label">
                数据源选择
              </Form.Label>
              <RadioGroup 
                value={config.dataSourceType} 
                onChange={(e) => setConfig({...config, dataSourceType: e.target.value as string})}
                type="button"
                style={{ width: '100%' }}
              >
                <Radio value="current" style={{ flex: 1 }}>当前时间</Radio>
                <Radio value="table" style={{ flex: 1 }}>数据表</Radio>
                <Radio value="custom" style={{ flex: 1 }}>自定义</Radio>
              </RadioGroup>
            </div>

            {config.dataSourceType === 'custom' ? (
              <>
                <div className="form-item">
                  <Form.Label className="label">
                    标签名称
                  </Form.Label>
                  <Input
                    value={config.customDateName}
                    onChange={(value) => setConfig({...config, customDateName: value})}
                    className="input"
                    placeholder="如：更新时间、任务截止时间等"
                  />
                </div>
                <div className="form-item">
                  <Form.Label className="label">
                    自定义时间
                  </Form.Label>
                  <Input
                    value={config.customDateTime}
                    onChange={(value) => setConfig({...config, customDateTime: value})}
                    className="input"
                    placeholder="输入时间，如：2025/12/21 15:48:03"
                  />
                  <Typography.Text type="tertiary" size="small" style={{ marginTop: 8, display: 'block' }}>
                    可以输入任意格式的时间文本
                  </Typography.Text>
                </div>
              </>
            ) : config.dataSourceType === 'current' ? (
              <>
                <div className="form-item">
                  <Form.Label className="label">
                    时区选择
                  </Form.Label>
                  <Select
                    value={config.timeZone}
                    onChange={(value) => setConfig({...config, timeZone: value as string})}
                    className="input"
                    optionList={TIME_ZONES}
                    filter
                    placeholder="选择时区"
                  />
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    显示设置
                  </Form.Label>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 12,
                    padding: '12px 16px',
                    background: 'var(--semi-color-fill-0)',
                    borderRadius: '8px',
                    border: '1px solid var(--semi-color-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>显示日期</span>
                      <Switch
                        checked={config.showDate}
                        onChange={(checked) => setConfig({...config, showDate: checked})}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>显示时间</span>
                      <Switch
                        checked={config.showTime}
                        onChange={(checked) => setConfig({...config, showTime: checked})}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>显示时区</span>
                      <Switch
                        checked={config.showTimeZone}
                        onChange={(checked) => setConfig({...config, showTimeZone: checked})}
                      />
                    </div>
                  </div>
                </div>
                
                {config.showDate && (
                  <div className="form-item">
                    <Form.Label className="label">
                      日期格式
                    </Form.Label>
                    <Select
                      value={config.dateFormat}
                      onChange={(value) => setConfig({...config, dateFormat: value as string})}
                      className="input"
                      optionList={[
                        { value: 'YYYY-MM-DD', label: '年-月-日 (YYYY-MM-DD)' },
                        { value: 'MM/DD/YYYY', label: '月/日/年 (MM/DD/YYYY)' },
                        { value: 'DD/MM/YYYY', label: '日/月/年 (DD/MM/YYYY)' },
                        { value: 'MMM DD, YYYY', label: '月份 日, 年 (MMM DD, YYYY)' },
                      ]}
                    />
                  </div>
                )}
                
                {config.showTime && (
                  <div className="form-item">
                    <Form.Label className="label">
                      时间格式
                    </Form.Label>
                    <Select
                      value={config.timeFormat}
                      onChange={(value) => setConfig({...config, timeFormat: value as string})}
                      className="input"
                      optionList={[
                        { value: 'HH:mm:ss', label: '24小时制 (HH:mm:ss)' },
                        { value: 'hh:mm:ss A', label: '12小时制 (hh:mm:ss A)' },
                        { value: 'HH:mm', label: '无秒 (HH:mm)' },
                      ]}
                    />
                  </div>
                )}
                
                <div className="form-item">
                  <Form.Label className="label">
                    字体大小: {config.fontSize}px
                  </Form.Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Input
                      type="range"
                      min="12"
                      max="72"
                      value={config.fontSize}
                      onChange={(value) => setConfig({...config, fontSize: Number(value)})}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: 50, textAlign: 'right' }}>{config.fontSize}px</span>
                  </div>
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    字体颜色
                  </Form.Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input
                      type="color"
                      value={config.fontColor}
                      onChange={(e) => setConfig({...config, fontColor: e.target.value})}
                      style={{ width: '100%', height: 36, cursor: 'pointer', border: '1px solid var(--semi-color-border)', borderRadius: 4 }}
                    />
                    <span style={{ minWidth: 80, textAlign: 'right' }}>{config.fontColor}</span>
                  </div>
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    标签名称
                  </Form.Label>
                  <Input
                    value={config.currentDateName}
                    onChange={(value) => setConfig({...config, currentDateName: value})}
                    placeholder="请输入当前时间标签"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-item">
                  <Form.Label className="label">
                    选择数据表
                  </Form.Label>
                  <Select
                    value={config.tableName}
                    onChange={handleTableChange}
                    className="input"
                    optionList={tables.filter(t => t && t.id && t.name).map(table => ({ 
                      value: table.id, 
                      label: table.name 
                    }))}
                    placeholder="请选择数据表"
                    loading={loading}
                    filter
                    showClear
                    emptyContent={tables.length === 0 ? '暂无数据表' : '未找到匹配的数据表'}
                  />
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    选择日期字段
                  </Form.Label>
                  <Select
                    value={config.fieldName}
                    onChange={handleFieldChange}
                    className="input"
                    optionList={fields.map(field => ({ value: field.id, label: field.name }))}
                    placeholder="请选择日期字段"
                    loading={loading}
                    disabled={!config.tableName}
                    emptyContent={!config.tableName ? '请先选择数据表' : '该表没有日期字段'}
                    showClear
                  />
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    选择数据行
                    <span style={{fontSize: '12px', color: '#999', marginLeft: '8px'}}>
                      (0=第一行数据)
                    </span>
                  </Form.Label>
                  <InputNumber
                    value={config.rowIndex || 0}
                    onChange={(value) => setConfig({...config, rowIndex: Number(value) || 0})}
                    min={0}
                    step={1}
                    placeholder="输入行号"
                    className="input"
                    disabled={!config.tableName}
                  />
                </div>
                
                <div className="form-item">
                  <Form.Label className="label">
                    数据筛选
                    <span style={{fontSize: '12px', color: '#999', marginLeft: '8px'}}>
                      (按日期条件筛选记录)
                    </span>
                  </Form.Label>
                  <Switch
                    checked={config.useFilter}
                    onChange={(checked) => setConfig({...config, useFilter: checked})}
                    disabled={!config.fieldName}
                  />
                </div>
                
                {config.useFilter && (
                  <>
                    <div className="form-item">
                      <Form.Label className="label">筛选条件</Form.Label>
                      <Select
                        value={config.filterOperator}
                        onChange={(value) => setConfig({...config, filterOperator: value as any})}
                        className="input"
                        disabled={!config.fieldName}
                      >
                        <Select.Option value="is">等于</Select.Option>
                        <Select.Option value="isGreater">晚于（大于）</Select.Option>
                        <Select.Option value="isLess">早于（小于）</Select.Option>
                        <Select.Option value="isEmpty">为空</Select.Option>
                        <Select.Option value="isNotEmpty">不为空</Select.Option>
                      </Select>
                    </div>
                    
                    {config.filterOperator !== 'isEmpty' && config.filterOperator !== 'isNotEmpty' && (
                      <div className="form-item">
                        <Form.Label className="label">筛选日期</Form.Label>
                        <DatePicker
                          type="dateTime"
                          value={config.filterValue ? new Date(config.filterValue) : undefined}
                          onChange={(date) => {
                            const timestamp = date ? new Date(date as any).getTime() : null;
                            setConfig({...config, filterValue: timestamp});
                          }}
                          className="input"
                          placeholder="选择日期时间"
                          format="yyyy-MM-dd HH:mm:ss"
                        />
                      </div>
                    )}
                  </>
                )}
                
                <div className="form-item">
                  <Form.Label className="label">
                    标签名称
                  </Form.Label>
                  <Input
                    value={config.tableDateName}
                    onChange={(value) => setConfig({...config, tableDateName: value})}
                    placeholder="请输入数据更新时间标签"
                  />
                </div>
              </>
            )}
          </Form>
          <Button
            type="primary"
            theme="solid"
            className="btn"
            onClick={saveConfig}
            size="large"
          >
            保存配置
          </Button>
        </div>
      )}
    </main>
  );
}

export default App;
