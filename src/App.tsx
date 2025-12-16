import { dashboard, DashboardState } from "@lark-base-open/js-sdk";
import React, { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, Switch, Form, Space } from "@douyinfe/semi-ui";
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
}

function App() {
  const { bgColor } = useTheme();

  const [config, setConfig] = useState<IDateTimeConfig>(DEFAULT_CONFIG);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  let isCreate = false;
  let isConfig = false;
  
  try {
    isCreate = dashboard.state === DashboardState.Create;
    /** 是否配置模式下 */
    isConfig = dashboard.state === DashboardState.Config || isCreate;
  } catch (e) {
    setError('无法访问飞书仪表盘API: ' + (e instanceof Error ? e.message : String(e)));
  }

  // 移除了 useTranslation 因为我们没有配置 i18n

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

  // 格式化时间显示
  const formatDateTime = () => {
    try {
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
          <div className="datetime-display">
            <div 
              className="date-text" 
              style={{ 
                fontSize: `${config.fontSize}px`,
                color: config.fontColor
              }}
            >
              {formatDateTime()}
            </div>
            {config.showTimeZone && (
              <div className="timezone-text">
                {config.timeZone}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isConfig && (
        <div className="config-panel">
          <Form className="form">
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
              />
            </div>
            
            <div className="form-item">
              <Form.Label className="label">
                显示设置
              </Form.Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>日期</span>
                  <Switch
                    checked={config.showDate}
                    onChange={(checked) => setConfig({...config, showDate: checked})}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>时间</span>
                  <Switch
                    checked={config.showTime}
                    onChange={(checked) => setConfig({...config, showTime: checked})}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>时区</span>
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
                <span>{config.fontSize}px</span>
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
                  style={{ width: '100%' }}
                />
                <span>{config.fontColor}</span>
              </div>
            </div>
          </Form>
          <Button
            type="primary"
            theme="solid"
            className="btn"
            onClick={saveConfig}
          >
            保存配置
          </Button>
        </div>
      )}
    </main>
  );
}

export default App;