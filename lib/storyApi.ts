/**
 * 故事生成 API 客户端
 * 用于调用算力机器上的故事生成服务
 */

// API 配置
const STORY_API_CONFIG = {
    baseUrl: process.env.STORY_API_URL || 'http://localhost:8000',
    callbackUrl: process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/api/story-callback` : 'https://story.66668888.cloud/api/story-callback'
};

// 故事包 ID 映射
const PACKAGE_ID_MAP: { [key: string]: string } = {
    '第一次体验': 'trial',
    '1-3岁故事包': '1-3',
    '4-6岁故事包': '4-6',
    '6-11岁故事包': '6-11',
    '哄睡故事包': 'sleep',
    '勇敢成长包': 'brave',
    '情绪管理包': 'emotion'
};

interface CreateTaskParams {
    babyName: string;
    parentType: '爸爸' | '妈妈';
    packageId: string;
    voiceFileBuffer: Buffer;
    voiceFileName: string;
}

interface TaskResponse {
    success: boolean;
    taskId?: string;
    message?: string;
    error?: string;
}

interface TaskStatus {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    downloadUrl?: string;
    error?: string;
}

/**
 * 获取故事包 ID
 */
export function getPackageId(productName: string): string {
    return PACKAGE_ID_MAP[productName] || 'trial';
}

/**
 * 创建故事生成任务
 */
export async function createStoryTask(params: CreateTaskParams): Promise<TaskResponse> {
    try {
        console.log('📝 创建故事生成任务...');
        console.log('参数:', {
            babyName: params.babyName,
            parentType: params.parentType,
            packageId: params.packageId,
            voiceFileName: params.voiceFileName,
            voiceFileSize: params.voiceFileBuffer.length
        });

        // 准备 FormData
        const formData = new FormData();
        formData.append('baby_name', params.babyName);
        formData.append('parent_type', params.parentType);
        formData.append('package_id', params.packageId);
        formData.append('callback_url', STORY_API_CONFIG.callbackUrl);
        
        // 将 Buffer 转换为 Blob
        const uint8Array = new Uint8Array(params.voiceFileBuffer);
        const blob = new Blob([uint8Array], { type: 'audio/webm' });
        formData.append('voice_file', blob, params.voiceFileName);

        console.log('🌐 API 地址:', `${STORY_API_CONFIG.baseUrl}/api/generate`);
        console.log('🔔 回调地址:', STORY_API_CONFIG.callbackUrl);

        // 发送请求
        const response = await fetch(`${STORY_API_CONFIG.baseUrl}/api/generate`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json() as any;

        if (response.status === 202 && result.task_id) {
            console.log('✅ 任务创建成功，task_id:', result.task_id);
            return {
                success: true,
                taskId: result.task_id,
                message: result.message
            };
        } else {
            console.error('❌ 任务创建失败:', result);
            return {
                success: false,
                error: result.error || '创建任务失败'
            };
        }

    } catch (error: any) {
        console.error('❌ 调用故事生成 API 失败:', error);
        return {
            success: false,
            error: error.message || '网络请求失败'
        };
    }
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    try {
        console.log('🔍 查询任务状态:', taskId);

        const response = await fetch(`${STORY_API_CONFIG.baseUrl}/api/status/${taskId}`);
        const result = await response.json() as any;

        if (response.ok) {
            return {
                taskId: result.task_id,
                status: result.status,
                progress: result.progress,
                downloadUrl: result.download_url,
                error: result.error
            };
        } else {
            console.error('❌ 查询任务状态失败:', result);
            return null;
        }

    } catch (error: any) {
        console.error('❌ 查询任务状态异常:', error);
        return null;
    }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const response = await fetch(`${STORY_API_CONFIG.baseUrl}/api/health`);
        const result = await response.json() as any;
        return result.status === 'healthy';
    } catch (error) {
        console.error('❌ API 健康检查失败:', error);
        return false;
    }
}

/**
 * 获取可用故事包列表
 */
export async function getAvailablePackages(): Promise<any[]> {
    try {
        const response = await fetch(`${STORY_API_CONFIG.baseUrl}/api/packages`);
        const result = await response.json() as any;
        return result.packages || [];
    } catch (error) {
        console.error('❌ 获取故事包列表失败:', error);
        return [];
    }
}
