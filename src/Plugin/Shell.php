<?php

namespace PHPCensor\Plugin;

use PHPCensor\Builder;
use PHPCensor\Model\Build;
use PHPCensor\Plugin;

/**
 * Shell Plugin - Allows execute shell commands.
 *
 * @package    PHP Censor
 * @subpackage Application
 *
 * @author Kinn Coelho Julião <kinncj@gmail.com>
 * @author Dmitry Khomutov <poisoncorpsee@gmail.com>
 */
class Shell extends Plugin
{
    /**
     * @var string[] $commands The commands to be executed
     */
    protected $commands = [];

    protected $executeAll = false;

    /**
     * @return string
     */
    public static function pluginName()
    {
        return 'shell';
    }

    /**
     * {@inheritDoc}
     */
    public function __construct(Builder $builder, Build $build, array $options = [])
    {
        parent::__construct($builder, $build, $options);

        if (\array_key_exists('execute_all', $options) && $options['execute_all']) {
            $this->executeAll = true;
        }

        if (isset($options['commands']) && \is_array($options['commands'])) {
            $this->commands = $options['commands'];

            return;
        }
    }

    /**
     * Runs the shell command.
     *
     * @return bool
     */
    public function execute()
    {
        $result = true;
        foreach ($this->commands as $command) {
            $command = $this->builder->interpolate($command);

            if (!$this->builder->executeCommand($command)) {
                $result = false;

                if (!$this->executeAll) {
                    return $result;
                }
            }
        }

        return $result;
    }
}
