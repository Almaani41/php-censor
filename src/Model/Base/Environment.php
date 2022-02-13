<?php

declare(strict_types=1);

namespace PHPCensor\Model\Base;

use PHPCensor\Model;

/**
 * @package    PHP Censor
 * @subpackage Application
 *
 * @author Dmitry Khomutov <poisoncorpsee@gmail.com>
 */
class Environment extends Model
{
    protected array $data = [
        'id'         => null,
        'project_id' => null,
        'name'       => null,
        'branches'   => [],
    ];

    protected array $casts = [
        'project_id' => 'integer',
        'branches'   => 'newline'
    ];

    public function getProjectId(): ?int
    {
        return $this->getData('project_id');
    }

    public function setProjectId(int $value): bool
    {
        return $this->setData('project_id', $value);
    }

    public function getName(): ?string
    {
        return $this->getData('name');
    }

    public function setName(string $value): bool
    {
        return $this->setData('name', $value);
    }

    public function getBranches(): array
    {
        return $this->getData('branches');
    }

    public function setBranches(array $value): bool
    {
        return $this->setData('branches', $value);
    }
}
